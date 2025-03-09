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

    // Implement retry logic with exponential backoff
    const maxRetries = 5; // Define the maximum number of retries
    let retries = 0;
    let aiResponse;
    let delay = 5000; // Start with 2 second delay

    while (retries <= maxRetries) {
      try {
        // Call Azure OpenAI API for summarization
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

        // If request succeeded, break out of the retry loop
        if (aiResponse.ok) {
          break;
        }

        // If we get a rate limit error (status 429), retry after delay
        if (aiResponse.status === 429) {
          console.log(
            `Rate limit exceeded (attempt ${retries + 1}/${maxRetries + 1}). Retrying after ${delay / 1000} seconds.`
          );

          // Extract retry-after header if available, otherwise use our exponential backoff
          const retryAfter = aiResponse.headers.get("retry-after");
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : delay;

          await new Promise(resolve => setTimeout(resolve, waitTime));
          retries++;
          delay *= 2; // Exponential backoff
          continue;
        }

        // If it's not a rate limit error and not successful, throw error
        throw new Error(`Azure OpenAI API returned status ${aiResponse.status}`);
      } catch (error) {
        console.error(`Error calling Azure OpenAI API (attempt ${retries + 1}/${maxRetries + 1}):`, error);

        // If we've reached max retries, throw the error
        if (retries >= maxRetries) {
          throw error;
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        retries++;
        delay *= 2; // Exponential backoff
      }
    }

    // If we've exhausted all retries without success
    if (!aiResponse || !aiResponse.ok) {
      throw new Error("Failed to get response from Azure OpenAI API after multiple retries");
    }

    // [rest of the function remains the same]
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

// Function to process a list of URLs and return articles with titles and summaries
// Process URLs with throttling to avoid rate limits
async function processUrlList(urls: string[], concurrencyLimit: number = 3): Promise<Article[]> {
  console.log(`Processing ${urls.length} custom URLs with concurrency limit of ${concurrencyLimit}`);

  const articles: Article[] = [];

  // Process URLs in batches to control concurrency
  for (let i = 0; i < urls.length; i += concurrencyLimit) {
    const batch = urls.slice(i, i + concurrencyLimit);
    console.log(
      `Processing batch ${Math.floor(i / concurrencyLimit) + 1}/${Math.ceil(urls.length / concurrencyLimit)}`
    );

    const batchResults = await Promise.allSettled(
      batch.map(async (url, batchIndex) => {
        const index = i + batchIndex;
        console.log(`Processing custom URL ${index + 1}/${urls.length}: ${url}`);

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
        } catch (error) {
          console.error(`Error processing URL ${url}:`, error);
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

      console.log(`Found ${articles.length} unique articles from Google`);

      // Check if summaries should be processed
      const shouldProcessSummaries = processSummaries === "true";

      // If requested, fetch titles and summaries for each article (limit to avoid timeout)
      if (shouldProcessSummaries && articles.length > 0) {
        // Process only the first 20 articles to avoid timeouts
        const articlesToProcess = articles.slice(0, 20);
        const processedArticles = [];
        const concurrencyLimit = 1; // Process 3 articles at a time

        // Process articles in batches to control concurrency
        for (let i = 0; i < articlesToProcess.length; i += concurrencyLimit) {
          const batch = articlesToProcess.slice(i, i + concurrencyLimit);
          console.log(
            `Processing article batch ${Math.floor(i / concurrencyLimit) + 1}/${Math.ceil(
              articlesToProcess.length / concurrencyLimit
            )}`
          );

          const batchResults = await Promise.allSettled(
            batch.map(async (article, batchIndex) => {
              const index = i + batchIndex;
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
              } catch (error) {
                console.error(`Error processing article ${article.link}:`, error);
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

        console.log(`Processed ${articlesToProcess.length} articles with summaries`);
      }
    }

    // Process direct URLs (only in POST)
    if (req.method === "POST" && req.body.urls && Array.isArray(req.body.urls)) {
      // Get the custom URLs from the request
      const customUrls = req.body.urls;

      if (customUrls.length > 0) {
        // Process the URL list to get titles and summaries
        const customArticles = await processUrlList(customUrls);
        console.log(`Processed ${customArticles.length} custom URLs`);

        // Add the custom articles to the articles array
        articles = [...articles, ...customArticles];
      }
    }

    // Return the results
    return res.status(200).json({
      articles: articles,
    });
  } catch (error) {
    console.error("Error fetching or processing articles:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return res.status(500).json({
      error: "Failed to fetch or process articles",
      details: errorMessage,
    });
  }
}
