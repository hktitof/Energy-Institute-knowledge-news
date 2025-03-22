// pages/api/extract-and-summarize.ts
import axios from "axios";
import { JSDOM } from "jsdom";
import { NextApiRequest, NextApiResponse } from "next";

interface RequestBody {
  url: string;
  maxWords?: number;
}

interface SuccessResponse {
  success: true;
  url: string;
  title: string;
  summary: string;
  originalContent: string;
  contentLength: number;
  jsonOutput: {
    title: string;
    summary: string;
  };
}

interface ErrorResponse {
  success: false;
  error: string;
}
interface RequestBody {
  url: string;
  maxWords?: number;
  forwardHeaders?: Record<string, string>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
): Promise<void> {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { url, maxWords = 100, forwardHeaders = {} }: RequestBody = req.body;

  if (!url) {
    return res.status(400).json({ success: false, error: "URL is required" });
  }

  try {
    // Step 1: Extract the article content
    // Fetch the HTML content
    const response = await axios.get(url, {
      headers: {
        // Default headers
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Cache-Control": "max-age=0",
        "Sec-Ch-Ua": '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        // Override with any forwarded headers
      },
      // Important for some sites
      withCredentials: true,
      ...(forwardHeaders.Cookie
        ? {
            headers: {
              ...forwardHeaders,
              Cookie: forwardHeaders.Cookie,
            },
          }
        : {}),
      timeout: 15000,
      maxRedirects: 5,
    });

    

    // Parse the HTML using JSDOM
    const dom = new JSDOM(response.data, { url });
    const document = dom.window.document;

    // Extract all visible text from the document
    function extractAllVisibleText(doc: Document): string {
      // Remove all script and style elements
      const scripts = doc.querySelectorAll("script, style, noscript, svg, head");
      scripts.forEach(el => el.remove());

      // Function to recursively extract text from nodes
      function extractTextFromNode(node: Node): string {
        // Text node - return its content
        if (node.nodeType === node.TEXT_NODE) {
          return node.textContent?.trim() || "";
        }

        // Not an element node
        if (node.nodeType !== node.ELEMENT_NODE) {
          return "";
        }

        const element = node as Element;

        // Skip hidden elements
        const hasHiddenAttr =
          element.hasAttribute("hidden") ||
          element.getAttribute("aria-hidden") === "true" ||
          element.getAttribute("style")?.includes("display: none") ||
          element.getAttribute("style")?.includes("visibility: hidden");

        if (hasHiddenAttr) {
          return "";
        }

        // Collect text from all child nodes
        let textContent = "";
        for (let i = 0; i < node.childNodes.length; i++) {
          textContent += extractTextFromNode(node.childNodes[i]) + " ";
        }

        // Add line breaks for block elements to improve readability
        const blockTags = [
          "DIV",
          "P",
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
        ];
        if (blockTags.includes(element.tagName)) {
          return "\n" + textContent.trim() + "\n";
        }

        return textContent.trim();
      }

      // Get all text from the body
      const bodyText = extractTextFromNode(doc.body);

      // Clean up the text
      return bodyText
        .replace(/\n{3,}/g, "\n\n") // Replace multiple newlines with double newlines
        .replace(/\s+/g, " ") // Replace multiple spaces with single space
        .replace(/\n +/g, "\n") // Remove spaces after newlines
        .replace(/ +\n/g, "\n") // Remove spaces before newlines
        .split("\n") // Split by newlines
        .map(line => line.trim()) // Trim each line
        .filter(line => line) // Remove empty lines
        .join("\n") // Join back with newlines
        .trim(); // Final trim
    }

    // Get a clean title - try to extract the main title without site name
    const rawTitle = document.title || "";

    // Find h1 element which often has the main title
    const h1Elements = document.querySelectorAll("h1");
    let mainHeading = "";

    if (h1Elements.length > 0) {
      // Usually the first h1 is the main title
      mainHeading = h1Elements[0].textContent?.trim() || "";
    }

    // Choose the best title
    let title = mainHeading || rawTitle;

    // Clean up the title - remove site names like "| Site Name" or "- Site Name"
    title = title.replace(/\s*[|\-–—]\s*[^|\-–—]+$/, "").trim();

    // If title still has site indicators, try to get just the first part
    if (!title || title.length < 5) {
      title = rawTitle.split(/[|\-–—]/)[0].trim();
    }

    // Extract all visible text
    const textContent = extractAllVisibleText(document);

    // Step 2: Summarize the extracted content
    const endpoint = process.env.AZURE_OPENAI_API_BASE?.replace(/\/$/, "");
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

    if (!endpoint || !apiKey || !deploymentName) {
      return res.status(500).json({
        success: false,
        error: "Azure OpenAI API configuration is missing",
      });
    }

    // Call Azure OpenAI API for summarization with improved prompt
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
              role: "user",
              content: `Create a concise summary (maximum ${maxWords} words) of the following article. Focus only on the key information, main arguments, and essential details. The summary should be professional and focused without any introductory phrases like "This article discusses" or "Summary:".

Article title: ${title}
Article content: ${textContent}

Return your response as a JSON object with this exact format:
{
  "title": "The exact article title",
  "summary": "The concise summary of the article"
}`,
            },
          ],
          max_tokens: 800,
          temperature: 0.3, // Lower temperature for more focused/consistent output
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json();
      return res.status(aiResponse.status).json({
        success: false,
        error: `Azure OpenAI API error: ${errorData.error?.message || "Unknown error"}`,
      });
    }

    const aiData = await aiResponse.json();
    const aiOutput = aiData.choices[0].message.content;

    // Parse the JSON response
    let jsonOutput;
    try {
      jsonOutput = JSON.parse(aiOutput);
      // Validate the JSON structure
      if (!jsonOutput.title || !jsonOutput.summary) {
        throw new Error("Invalid JSON structure");
      }
    } catch (error) {
      // If JSON parsing fails, create a valid JSON from the raw response
      console.error("Failed to parse JSON from API response:", error);
      jsonOutput = {
        title: title,
        summary: aiOutput.replace(/^.*?summary":\s*"(.*?)"\s*}.*?$/, "$1").trim(),
      };
    }

    // Return the extracted text and summary
    return res.status(200).json({
      success: true,
      url: url,
      title: title,
      summary: jsonOutput.summary,
      originalContent: textContent,
      contentLength: textContent.length,
      jsonOutput: {
        title: jsonOutput.title,
        summary: jsonOutput.summary,
      },
    });
  } catch (error) {
    console.error("Error processing request:", error);

    const errorMessage =
      axios.isAxiosError(error) && error.response
        ? `Error ${error.response.status}: ${error.response.statusText}`
        : (error as Error).message;

    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
}
