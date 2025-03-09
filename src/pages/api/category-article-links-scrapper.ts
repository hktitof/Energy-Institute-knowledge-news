// pages/api/category-article-links-scrapper.ts
import axios from "axios";
import { load } from "cheerio";
import { NextApiRequest, NextApiResponse } from "next";
import { Article } from "@/utils/utils";
import { JSDOM } from "jsdom";

interface NewsResponse {
  articles: Article[];
}

interface ErrorResponse {
  error: string;
  details?: string;
}

async function extractAndSummarize(
  url: string,
  maxWords: number = 100
): Promise<{ title: string; summary: string } | null> {
  try {
    // Fetch the HTML content
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      timeout: 15000,
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

    // Call Azure OpenAI API for summarization with improved prompt
    const endpoint = process.env.AZURE_OPENAI_API_BASE?.replace(/\/$/, "");
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

    if (!endpoint || !apiKey || !deploymentName) {
      console.error("Azure OpenAI API configuration is missing");
      return null;
    }

    // Call Azure OpenAI API for summarization
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
    
    Return your response as a JSON object with this exact format, without any markdown formatting or code blocks:
    {
      "title": "The exact article title",
      "summary": "The concise summary of the article"
    }
    
    IMPORTANT: Return only the raw JSON object, no markdown formatting, no code blocks, no backticks.`,
            },
          ],
          max_tokens: 800,
          temperature: 0.3, // Lower temperature for more focused/consistent output
          response_format: { type: "json_object" }, // Specify JSON response format if the API supports it
        }),
      }
    );

    if (!aiResponse.ok) {
      return null;
    }

    const aiData = await aiResponse.json();
    const aiOutput = aiData.choices[0].message.content;

    // Parse the JSON response
    let jsonOutput;
    try {
      // Remove markdown code block formatting if present
      const cleanedOutput = aiOutput
        .replace(/```json\s*/, "")
        .replace(/```\s*$/, "")
        .trim();
      jsonOutput = JSON.parse(cleanedOutput);
      // Validate the JSON structure
      if (!jsonOutput.title || !jsonOutput.summary) {
        throw new Error("Invalid JSON structure");
      }
    } catch (error) {
      // If JSON parsing fails, create a valid JSON from the raw response
      console.error("Failed to parse JSON from API response:", error);

      // More robust regex that can handle nested quotes in the summary
      const titleMatch = aiOutput.match(/"title"\s*:\s*"((?:\\"|[^"])*)"/);
      const summaryMatch = aiOutput.match(/"summary"\s*:\s*"((?:\\"|[^"])*)"/);

      jsonOutput = {
        title: titleMatch ? titleMatch[1].replace(/\\"/g, '"') : title,
        summary: summaryMatch ? summaryMatch[1].replace(/\\"/g, '"') : aiOutput,
      };
      let summary = aiOutput;
      // First find the position of "summary":
      const summaryPos = summary.indexOf('"summary":');
      if (summaryPos !== -1) {
        // Find first quote after "summary":
        const startQuotePos = summary.indexOf('"', summaryPos + 10);
        if (startQuotePos !== -1) {
          // Find the closing quote (accounting for escaped quotes)
          let endQuotePos = startQuotePos + 1;
          let insideEscape = false;
          while (endQuotePos < summary.length) {
            if (summary[endQuotePos] === "\\") {
              insideEscape = !insideEscape;
            } else if (summary[endQuotePos] === '"' && !insideEscape) {
              break;
            } else {
              insideEscape = false;
            }
            endQuotePos++;
          }

          if (endQuotePos < summary.length) {
            summary = summary.substring(startQuotePos + 1, endQuotePos);
          }
        }
      }
    }

    return {
      title: jsonOutput.title,
      summary: jsonOutput.summary,
    };
  } catch (error) {
    console.error(`Error summarizing article ${url}:`, error);
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<NewsResponse | ErrorResponse>
): Promise<void> {
  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url, processSummaries } = req.query;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Search URL is required" });
  }

  try {
    // Add some logging to debug
    console.log("Attempting to fetch URL:", url);

    // Fetch the Google News search results page with additional safeguards
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      timeout: 10000, // 10 second timeout
      validateStatus: status => status < 500, // Only treat 500+ as errors
    });

    // Check if we got a valid response
    if (response.status !== 200) {
      console.error("Non-200 status from Google:", response.status);
      return res.status(response.status).json({
        error: "Failed to fetch from Google",
        details: `Status code: ${response.status}`,
      });
    }

    // Validate we actually got HTML content
    const contentType = response.headers["content-type"] || "";
    if (!contentType.includes("html")) {
      console.error("Unexpected content type:", contentType);
      return res.status(400).json({
        error: "Unexpected content type from Google",
        details: contentType,
      });
    }

    // Parse the HTML response with cheerio
    const $ = load(response.data);
    const articles: Article[] = [];

    // Log a sample of the HTML to debug
    console.log("HTML sample:", response.data.substring(0, 200) + "...");

    // Try different selectors for Google News articles
    const selectors = [
      "div.SoaBEf a", // Your original selector
      "div.WlydOe a", // Alternative selector
      "div.v7W49e a", // Another alternative
      "g-card a", // Fallback
    ];

    let foundArticles = false;

    for (const selector of selectors) {
      $(selector).each((index: number, element: cheerio.Element) => {
        const href: string | undefined = $(element).attr("href");
        if (href && href.startsWith("http") && !href.includes("google.com")) {
          articles.push({
            id: index.toString(),
            link: href,
            title: "",
            summary: "",
            selected: false,
          });
          foundArticles = true;
        }
      });

      if (foundArticles) break;
    }

    // If no articles found with any selector, try a more generic approach
    if (articles.length === 0) {
      $("a").each((index: number, element: cheerio.Element) => {
        const href: string | undefined = $(element).attr("href");
        if (
          href &&
          href.startsWith("http") &&
          !href.includes("google.com") &&
          !href.includes("gstatic.com") &&
          !href.includes("googleapis.com")
        ) {
          articles.push({
            id: index.toString(),
            link: href,
            title: "",
            summary: "",
            selected: false,
          });
        }
      });
    }

    // Remove duplicates
    const uniqueArticles = articles.filter(
      (article, index, self) => index === self.findIndex(a => a.link === article.link)
    );

    console.log(`Found ${uniqueArticles.length} unique articles`);

    // Check if summaries should be processed
    const shouldProcessSummaries = processSummaries === "true";

    // If requested, fetch titles and summaries for each article (limit to 5 to prevent timeout)
    if (shouldProcessSummaries && uniqueArticles.length > 0) {
      // Process only the first 5 articles to avoid timeouts
      const articlesToProcess = uniqueArticles.slice(0, 20);

      // Use Promise.allSettled to fetch all summaries in parallel and continue even if some fail
      const summaryResults = await Promise.allSettled(
        articlesToProcess.map(async (article, index) => {
          console.log(`Processing article ${index + 1}/${articlesToProcess.length}: ${article.link}`);
          const result = await extractAndSummarize(article.link);

          if (result) {
            // Update the article with the title and summary
            article.title = result.title;
            article.summary = result.summary;
          }

          return article;
        })
      );

      // Replace the first 5 articles with their processed versions
      summaryResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          uniqueArticles[index] = result.value;
        }
      });

      console.log(`Processed ${articlesToProcess.length} articles with summaries`);
    }

    // Return the results
    return res.status(200).json({
      articles: uniqueArticles,
    });
  } catch (error) {
    console.error("Error fetching news:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return res.status(500).json({
      error: "Failed to fetch news articles",
      details: errorMessage,
    });
  }
}
