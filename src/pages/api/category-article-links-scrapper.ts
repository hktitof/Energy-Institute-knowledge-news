import axios from "axios";
import { load } from "cheerio";
import { NextApiRequest, NextApiResponse } from "next";
import { Article } from "@/utils/utils";
import { JSDOM } from "jsdom";
import retry from "async-retry";
interface NewsResponse {
  articles: Article[];
}

interface ErrorResponse {
  error: string;
  details?: string;
}

interface CustomError extends Error {
  code?: string;
}

// Add this at the top of your file
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
        retries: 1, // Retry up to 3 times
        minTimeout: 1000, // Start with 1-second delay
        factor: 2, // Exponential backoff
        onRetry: (error: Error) => {
          console.log(`Retrying ${url} due to error: ${error.message}`);
        },
      }
    );

    // Parse the HTML using JSDOM
    const dom = new JSDOM(response.data, { url });
    const document = dom.window.document;

    // Extract all visible text (your existing function)
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

    // Extract and clean the title (your existing logic)
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

    // Azure OpenAI API call (your existing logic)
    const endpoint = process.env.AZURE_OPENAI_API_BASE?.replace(/\/$/, "");
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

    if (!endpoint || !apiKey || !deploymentName) {
      if (isDevelopment) console.error("Azure OpenAI API configuration is missing");
      return { title: "Configuration Error", summary: "Azure OpenAI API configuration is missing." };
    }

    let aiResponse;
    let retries = 0;
    const maxRetries = 2; // maximum number of retries
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

// Function to process a list of URLs and return articles with titles and summaries
// Process URLs with throttling to avoid rate limits
async function processUrlList(urls: string[], concurrencyLimit: number = 3): Promise<Article[]> {
  if (isDevelopment) console.log(`Processing ${urls.length} custom URLs with concurrency limit of ${concurrencyLimit}`);

  const articles: Article[] = [];

  // Process URLs in batches to control concurrency
  for (let i = 0; i < urls.length; i += concurrencyLimit) {
    const batch = urls.slice(i, i + concurrencyLimit);
    if (isDevelopment)
      console.log(
        `Processing batch ${Math.floor(i / concurrencyLimit) + 1}/${Math.ceil(urls.length / concurrencyLimit)}`
      );

    const batchResults = await Promise.allSettled(
      batch.map(async (url, batchIndex) => {
        const index = i + batchIndex;
        if (isDevelopment) console.log(`Processing custom URL ${index + 1}/${urls.length}: ${url}`);

        try {
          const result = await extractAndSummarize(url);

          if (result) {
            return {
              id: `custom-${index}`,
              link: url,
              title: result.title,
              summary: result.summary,
              selected: false,
            };
          } else {
            return {
              id: `custom-${index}`,
              link: url,
              title: "Failed to extract",
              summary: "Could not process this article.",
              selected: false,
            };
          }
        } catch (error: unknown) {
          if (isDevelopment) console.error(`Error processing URL ${url}:`, error);
          return {
            id: `custom-${index}`,
            link: url,
            title: "Error",
            summary: "An error occurred while processing this article.",
            selected: false,
          };
        }
      })
    );

    // Add successful results to articles array
    batchResults.forEach(result => {
      if (result.status === "fulfilled") {
        articles.push(result.value);
      }
    });

    // Add a short delay between batches to further reduce pressure on the API
    if (i + concurrencyLimit < urls.length) {
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  return articles;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<NewsResponse | ErrorResponse>
): Promise<void> {
  // Only allow GET and POST requests
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    let articles: Article[] = [];

    // Process Google search URL (can be used in both GET and POST)
    if (req.method === "GET" || (req.method === "POST" && req.body.searchUrl)) {
      const url = req.method === "GET" ? req.query.url : req.body.searchUrl;
      const processSummaries = req.method === "GET" ? req.query.processSummaries : req.body.processSummaries || "true";

      if (!url || typeof url !== "string") {
        return res.status(400).json({ error: "Search URL is required" });
      }

      // Add some logging to debug
      if (isDevelopment) console.log("Attempting to fetch URL:", url);

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
        if (isDevelopment) console.error("Non-200 status from Google:", response.status);
        return res.status(response.status).json({
          error: "Failed to fetch from Google",
          details: `Status code: ${response.status}`,
        });
      }

      // Validate we actually got HTML content
      const contentType = response.headers["content-type"] || "";
      if (!contentType.includes("html")) {
        if (isDevelopment) console.error("Unexpected content type:", contentType);
        return res.status(400).json({
          error: "Unexpected content type from Google",
          details: contentType,
        });
      }

      // Parse the HTML response with cheerio
      const $ = load(response.data);

      // Log a sample of the HTML to debug
      // console.log("HTML sample:", response.data.substring(0, 200) + "...");

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
      articles = articles.filter((article, index, self) => index === self.findIndex(a => a.link === article.link));

      if (isDevelopment) console.log(`Found ${articles.length} unique articles from Google`);

      // Check if summaries should be processed
      const shouldProcessSummaries = processSummaries === "true";

      // If requested, fetch titles and summaries for each article (limit to avoid timeout)
      if (shouldProcessSummaries && articles.length > 0) {
        // Process only the first 20 articles to avoid timeouts
        const articlesToProcess = articles.slice(0, 20);
        const processedArticles: Article[] = [];
        const concurrencyLimit = 2; // Process 3 articles at a time

        // Process articles in batches to control concurrency
        for (let i = 0; i < articlesToProcess.length; i += concurrencyLimit) {
          const batch = articlesToProcess.slice(i, i + concurrencyLimit);
          if (isDevelopment)
            console.log(
              `Processing article batch ${Math.floor(i / concurrencyLimit) + 1}/${Math.ceil(
                articlesToProcess.length / concurrencyLimit
              )}`
            );

          const batchResults = await Promise.allSettled(
            batch.map(async (article, batchIndex) => {
              const index = i + batchIndex;
              if (isDevelopment)
                console.log(`Processing article ${index + 1}/${articlesToProcess.length}: ${article.link}`);

              try {
                const result = await extractAndSummarize(article.link);

                if (result) {
                  // Create a new article with the title and summary
                  return {
                    ...article,
                    title: result.title,
                    summary: result.summary,
                  };
                }

                return article;
              } catch (error: unknown) {
                if (isDevelopment) console.error(`Error processing article ${article.link}:`, error);
                return article;
              }
            })
          );

          // Add successful results to processed articles array
          batchResults.forEach((result, batchIndex) => {
            if (result.status === "fulfilled") {
              processedArticles[i + batchIndex] = result.value;
            } else {
              processedArticles[i + batchIndex] = articlesToProcess[i + batchIndex];
            }
          });

          // Add a short delay between batches
          if (i + concurrencyLimit < articlesToProcess.length) {
            await new Promise(resolve => setTimeout(resolve, 15000));
          }
        }

        // Update the articles array with the processed articles
        processedArticles.forEach((article, index) => {
          articles[index] = article;
        });

        if (isDevelopment) console.log(`Processed ${articlesToProcess.length} articles with summaries`);
      }
    }

    // Process direct URLs (only in POST)
    if (req.method === "POST" && req.body.urls && Array.isArray(req.body.urls)) {
      // Get the custom URLs from the request
      const customUrls = req.body.urls;

      if (customUrls.length > 0) {
        // Process the URL list to get titles and summaries
        const customArticles = await processUrlList(customUrls);
        if (isDevelopment) console.log(`Processed ${customArticles.length} custom URLs`);

        // Add the custom articles to the articles array
        articles = [...articles, ...customArticles];
      }
    }

    // Return the results
    return res.status(200).json({
      articles: articles,
    });
  } catch (error: unknown) {
    if (isDevelopment) console.error("Error fetching or processing articles:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return res.status(500).json({
      error: "Failed to fetch or process articles",
      details: errorMessage,
    });
  }
}
