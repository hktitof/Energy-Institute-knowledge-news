import { JSDOM } from "jsdom";
import { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch"; // Use node-fetch or undici if required in Node env

// Define request body structure
interface RequestBody {
  htmlContent: string; // Expecting the full HTML source
  url?: string; // Optional: URL for context (like in JSDOM)
  maxWords?: number;
}

// Define response structures (simplified)
interface SuccessResponse {
  success: true;
  title: string;
  summary: string;
  jsonOutput: {
    title: string;
    summary: string;
  };
  url?: string; // Echo back the URL if provided
}

interface OpenAIErrorResponse {
  error?: {
    message?: string;
  };
}

interface OpenAIChatCompletionResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}
interface ErrorResponse {
  success: false;
  error: string;
  url?: string;
}

// Utility function to extract visible text (same as before)
function extractAllVisibleText(doc: Document): string {
  // Remove all script and style elements
  const scripts = doc.querySelectorAll("script, style, noscript, svg, head, footer, nav, aside, form, iframe, header"); // Added more common non-article tags
  scripts.forEach(el => el.remove());

  function extractTextFromNode(node: Node): string {
    if (node.nodeType === node.TEXT_NODE) {
      return node.textContent?.trim() || "";
    }
    if (node.nodeType !== node.ELEMENT_NODE) {
      return "";
    }
    const element = node as Element;
    const hasHiddenAttr =
      element.hasAttribute("hidden") || // Check for hidden attribute
      element.getAttribute("aria-hidden") === "true" || // Check for aria-hidden
      element.getAttribute("type") === "hidden" || // Check for input type hidden
      (element as HTMLElement).style?.display === "none" || // Check computed style if possible, else basic style attr
      (element as HTMLElement).style?.visibility === "hidden";

    if (hasHiddenAttr) return "";

    let textContent = "";
    for (let i = 0; i < node.childNodes.length; i++) {
      textContent += extractTextFromNode(node.childNodes[i]) + " ";
    }

    const blockTags = [
      "P",
      "DIV",
      "H1",
      "H2",
      "H3",
      "H4",
      "H5",
      "H6",
      "LI",
      "TD",
      "SECTION",
      "ARTICLE",
      "BLOCKQUOTE",
      "BR",
      "TR",
    ];
    if (blockTags.includes(element.tagName)) {
      return "\n" + textContent.trim() + "\n";
    }
    return textContent.trim();
  }

  const body = doc.body;
  if (!body) return ""; // Handle cases where body might not exist

  const bodyText = extractTextFromNode(body);

  return bodyText
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ") // Replace multiple spaces/tabs with single space
    .replace(/\n +/g, "\n")
    .replace(/ +\n/g, "\n")
    .split("\n")
    .map(line => line.trim())
    .filter(line => line && line.length > 10) // Filter out very short lines often being UI elements
    .join("\n")
    .trim();
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
): Promise<void> {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { htmlContent, url, maxWords = 150 }: RequestBody = req.body;

  if (!htmlContent) {
    return res.status(400).json({ success: false, error: "htmlContent is required" });
  }

  try {
    // Step 1: Parse the provided HTML and Extract Text/Title
    const dom = new JSDOM(htmlContent, { url: url }); // Provide URL for context if available
    const document = dom.window.document;

    // Extract Title (using the same logic as before)
    const rawTitle = document.title || "";
    const h1Elements = document.querySelectorAll("h1");
    let mainHeading = "";
    if (h1Elements.length > 0) {
      mainHeading = h1Elements[0].textContent?.trim() || "";
    }
    let title = mainHeading || rawTitle;
    title = title.replace(/\s*[|\-–—]\s*[^|\-–—]+$/, "").trim();
    if (!title || title.length < 5) {
      title = rawTitle.split(/[|\-–—]/)[0].trim();
    }
    title = title || "Untitled"; // Fallback title

    // Extract visible text
    const textContent = extractAllVisibleText(document);

    if (!textContent || textContent.length < 50) {
      // Add a minimum length check
      return res.status(400).json({
        success: false,
        error: "Could not extract sufficient text content from the provided HTML.",
        url: url,
      });
    }

    // Step 2: Summarize the extracted content using Azure OpenAI
    const endpoint = process.env.AZURE_OPENAI_API_BASE?.replace(/\/$/, "");
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

    if (!endpoint || !apiKey || !deploymentName) {
      console.error("Azure OpenAI API configuration is missing");
      return res.status(500).json({
        success: false,
        error: "Server configuration error [OpenAI API details missing]",
        url: url,
      });
    }

    // Call Azure OpenAI API
    const aiResponse = await fetch(
      `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=2024-02-15-preview`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system", // Added system role for better context
              content:
                "You are an AI assistant designed to summarize web articles concisely based on provided text content. Focus on key information and main points.",
            },
            {
              role: "user",
              content: `Create a concise summary (maximum ${maxWords} words) of the following article content. Focus only on the key information, main arguments, and essential details. Avoid introductory phrases like "This article discusses" or "Summary:".

Article title (for context): ${title}
Article text content:
---
${textContent.substring(0, 15000)}
---

Return your response as a JSON object with this exact format:
{
  "title": "${title}",
  "summary": "The concise summary of the article text"
}`, // Pass the extracted title back in the desired JSON structure
            },
          ],
          max_tokens: maxWords + 100, // Give some buffer for JSON structure
          temperature: 0.3,
          response_format: { type: "json_object" }, // Request JSON output directly if model supports it
        }),
        // timeout: 20000, // Optional: Add timeout for AI call
      }
    );

    if (!aiResponse.ok) {
      let errorBody = "Unknown API error";
      try {
        const errorData = (await aiResponse.json()) as OpenAIErrorResponse;
        errorBody = errorData.error?.message || JSON.stringify(errorData);
      } catch {
        errorBody = await aiResponse.text(); // Get raw text if not JSON
      }
      let errorMessage: string;
      if (typeof errorBody === "string") {
        errorMessage = errorBody;
      } else {
        errorMessage = JSON.stringify(errorBody);
      }

      console.error(`Azure OpenAI API error (${aiResponse.status}): ${errorMessage}`);
      return res.status(aiResponse.status).json({
        success: false,
        error: `Azure OpenAI API error: ${errorMessage}`,
        url: url,
      });
    }

    const aiData = (await aiResponse.json()) as OpenAIChatCompletionResponse;

    // Extract content based on expected structure
    const aiOutputContent = aiData.choices?.[0]?.message?.content;

    if (!aiOutputContent) {
      console.error("Invalid response structure from Azure OpenAI:", JSON.stringify(aiData));
      return res.status(500).json({ success: false, error: "Invalid response structure from AI service", url: url });
    }

    // Attempt to parse the JSON response from the AI
    let jsonOutput;
    try {
      jsonOutput = JSON.parse(aiOutputContent);
      if (typeof jsonOutput.title !== "string" || typeof jsonOutput.summary !== "string") {
        throw new Error("Invalid JSON structure in AI response content");
      }
    } catch (error) {
      console.error("Failed to parse JSON from AI response content:", error, "\nRaw content:", aiOutputContent);
      // Fallback: Try to extract summary heuristically or use the whole content as summary (less ideal)
      jsonOutput = {
        title: title, // Use the title we extracted earlier
        summary: aiOutputContent.replace(/\\n/g, "\n").trim(), // Basic cleanup if parsing fails
      };
    }

    // Return the summary
    return res.status(200).json({
      success: true,
      title: jsonOutput.title, // Use title from AI response
      summary: jsonOutput.summary,
      jsonOutput: {
        // Keep the nested jsonOutput field as per original spec
        title: jsonOutput.title,
        summary: jsonOutput.summary,
      },
      url: url, // Echo back URL
    });
  } catch (error: unknown) {
    console.error(`Error processing content for URL [${url || "N/A"}]:`, error);
    return res.status(500).json({
      success: false,
      error: (error as Error).message || "An internal server error occurred",
      url: url,
    });
  }
}
