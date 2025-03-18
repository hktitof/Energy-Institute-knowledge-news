import axios from "axios";
import { NextApiRequest, NextApiResponse } from "next";
import { Article } from "@/utils/utils";
import { JSDOM } from "jsdom";
import retry from "async-retry";

interface ArticleResponse {
  article: Article;
  success: boolean;
}

interface ErrorResponse {
  error: string;
  details?: string;
}

interface CustomError extends Error {
  code?: string;
}

const isDevelopment = process.env.NODE_ENV !== "production";

async function extractAndSummarize(url: string, maxWords: number = 100): Promise<{ title: string; summary: string }> {
  try {
    // Fetch the HTML content with retry logic
    const response = await retry(
      async () => {
        return await axios.get(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
          },
          timeout: 15000,
        });
      },
      {
        retries: 1,
        minTimeout: 1000,
        factor: 2,
        onRetry: (error: Error) => {
          console.log(`Retrying ${url} due to error: ${error.message}`);
        },
      }
    );

    // Parse the HTML using JSDOM
    const dom = new JSDOM(response.data, { url });
    const document = dom.window.document;

    // Extract all visible text
    function extractAllVisibleText(doc: Document): string {
      const scripts = doc.querySelectorAll("script, style, noscript, svg, head");
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
          element.hasAttribute("hidden") ||
          element.getAttribute("aria-hidden") === "true" ||
          element.getAttribute("style")?.includes("display: none") ||
          element.getAttribute("style")?.includes("visibility: hidden");
        if (hasHiddenAttr) {
          return "";
        }
        let textContent = "";
        for (let i = 0; i < node.childNodes.length; i++) {
          textContent += extractTextFromNode(node.childNodes[i]) + " ";
        }
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
      const bodyText = extractTextFromNode(doc.body);
      return bodyText
        .replace(/\n{3,}/g, "\n\n")
        .replace(/\s+/g, " ")
        .replace(/\n +/g, "\n")
        .replace(/ +\n/g, "\n")
        .split("\n")
        .map(line => line.trim())
        .filter(line => line)
        .join("\n")
        .trim();
    }

    // Extract and clean the title
    const rawTitle = document.title || "";
    const h1Elements = document.querySelectorAll("h1");
    const mainHeading = h1Elements.length > 0 ? h1Elements[0].textContent?.trim() || "" : "";
    let title = mainHeading || rawTitle;
    title = title.replace(/\s*[|\-–—]\s*[^|\-–—]+$/, "").trim();
    if (!title || title.length < 5) {
      title = rawTitle.split(/[|\-–—]/)[0].trim();
    }

    // Extract text content
    const textContent = extractAllVisibleText(document);

    // Azure OpenAI API call
    const endpoint = process.env.AZURE_OPENAI_API_BASE?.replace(/\/$/, "");
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

    if (!endpoint || !apiKey || !deploymentName) {
      if (isDevelopment) console.error("Azure OpenAI API configuration is missing");
      return { title: "Configuration Error", summary: "Azure OpenAI API configuration is missing." };
    }

    let aiResponse;
    let retries = 0;
    const maxRetries = 2;
    let delay = 5000;

    while (retries <= maxRetries) {
      try {
        aiResponse = await fetch(
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
        
        Return your response as a JSON object with this exact format, without any markdown formatting or code blocks:
        {
          "title": "The exact article title",
          "summary": "The concise summary of the article"
        }
        
        IMPORTANT: Return only the raw JSON object, no markdown formatting, no code blocks, no backticks.`,
                },
              ],
              max_tokens: 800,
              temperature: 0.3,
              response_format: { type: "json_object" },
            }),
          }
        );

        if (aiResponse.ok) break;

        if (aiResponse.status === 429) {
          if (isDevelopment)
            console.log(
              `Rate limit exceeded (attempt ${retries + 1}/${maxRetries + 1}). Retrying after ${delay / 1000} seconds.`
            );
          const retryAfter = aiResponse.headers.get("retry-after");
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : delay;
          await new Promise(resolve => setTimeout(resolve, waitTime));
          retries++;
          delay *= 2;
          continue;
        }

        throw new Error(`Azure OpenAI API returned status ${aiResponse.status}`);
      } catch (error: unknown) {
        if (isDevelopment)
          console.error(`Error calling Azure OpenAI API (attempt ${retries + 1}/${maxRetries + 1}):`, error);
        if (retries >= maxRetries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        retries++;
        delay *= 2;
      }
    }

    if (!aiResponse || !aiResponse.ok) {
      throw new Error("Failed to get response from Azure OpenAI API after retries");
    }

    const aiData = await aiResponse.json();
    const aiOutput = aiData.choices[0].message.content;

    let jsonOutput;
    try {
      const cleanedOutput = aiOutput
        .replace(/```json\s*/, "")
        .replace(/```\s*$/, "")
        .trim();
      jsonOutput = JSON.parse(cleanedOutput);
      if (!jsonOutput.title || !jsonOutput.summary) {
        throw new Error("Invalid JSON structure");
      }
    } catch (error) {
      if (isDevelopment) console.error("Failed to parse JSON from API response:", error);
      const titleMatch = aiOutput.match(/"title"\s*:\s*"((?:\\"|[^"])*)"/);
      const summaryMatch = aiOutput.match(/"summary"\s*:\s*"((?:\\"|[^"])*)"/);
      jsonOutput = {
        title: titleMatch ? titleMatch[1].replace(/\\"/g, '"') : title,
        summary: summaryMatch ? summaryMatch[1].replace(/\\"/g, '"') : "Failed to generate summary.",
      };
    }

    return {
      title: jsonOutput.title,
      summary: jsonOutput.summary,
    };
  } catch (error: unknown) {
    // Enhanced error handling with specific placeholders
    if (axios.isAxiosError(error) && error.response && error.response.status === 403) {
      return { title: "Access Denied", summary: "Unable to fetch content due to access restrictions." };
    } else if (
      error instanceof Error &&
      ["ECONNRESET", "ETIMEDOUT", "ECONNABORTED"].includes((error as CustomError).code || "")
    ) {
      return { title: "Fetch Error", summary: "Unable to fetch content due to network issues." };
    } else {
      if (isDevelopment) console.error(`Error summarizing article ${url}:`, error);
      return { title: "Error", summary: "Failed to process article." };
    }
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ArticleResponse | ErrorResponse>
): Promise<void> {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { url, articleId } = req.body;

    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Article URL is required" });
    }

    if (!articleId) {
      return res.status(400).json({ error: "Article ID is required" });
    }

    if (isDevelopment) console.log(`Processing article with ID ${articleId}: ${url}`);

    // Process the article
    try {
      const result = await extractAndSummarize(url);
      
      // Create the article object
      const article: Article = {
        id: articleId.toString(),
        link: url,
        title: result.title,
        summary: result.summary,
        selected: false,
      };

      // Return the article
      return res.status(200).json({
        article,
        success: true,
      });
    } catch (error: unknown) {
      if (isDevelopment) console.error(`Error processing article ${url}:`, error);
      
      // Return an error article
      const errorArticle: Article = {
        id: articleId.toString(),
        link: url,
        title: "Error",
        summary: "An error occurred while processing this article.",
        selected: false,
      };
      
      return res.status(200).json({
        article: errorArticle,
        success: false,
      });
    }
  } catch (error: unknown) {
    if (isDevelopment) console.error("Error processing article:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return res.status(500).json({
      error: "Failed to process article",
      details: errorMessage,
    });
  }
}