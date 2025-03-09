import axios from "axios";
import { NextApiRequest, NextApiResponse } from "next";
import { JSDOM } from "jsdom";
import https from "https";

interface LinkInput {
  id?: string;
  url: string;
}

interface LinkOutput {
  id?: string;
  url: string;
  title: string;
  summary: string;
  error?: string;
}

interface SummaryResponse {
  results: LinkOutput[];
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
    // Create a custom axios instance with longer timeout and retries
    const axiosInstance = axios.create({
      timeout: 30000, // 30 seconds timeout
      httpsAgent: new https.Agent({
        rejectUnauthorized: false, // Ignore SSL certificate issues
      }),
      maxRedirects: 5,
    });

    // Add retry logic
    const maxRetries = 3;
    let retries = 0;
    let response;

    while (retries < maxRetries) {
      try {
        // Fetch the HTML content with different user agents to bypass simple blocks
        const userAgents = [
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15",
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36",
          "Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1"
        ];
        
        response = await axiosInstance.get(url, {
          headers: {
            "User-Agent": userAgents[retries % userAgents.length],
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Cache-Control": "max-age=0",
            "Referer": "https://www.google.com/",
          },
        });
        
        break; // Exit the retry loop if successful
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          // If it's ACS, try their API if available
          if (url.includes('pubs.acs.org')) {
            try {
              // For ACS publications, we can try to use their meta tags or API if available
              const metaTitle = url.split('/').pop() || '';
              return {
                title: `ACS Publication: ${metaTitle}`,
                summary: "This is an academic article from the American Chemical Society. The content requires special access permissions. Consider accessing directly through your institution's subscription or using the DOI to find the paper on other platforms."
              };
            } catch (e) {
              throw error; // Throw the original error if this fallback fails
            }
          } else {
            throw error;
          }
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
      }
    }

    // If we get here but don't have a response, something went wrong
    if (!response) {
      throw new Error("Failed to fetch content after retries");
    }

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

    // Try to extract meta information first (for paywall sites)
    const metaTags = document.querySelectorAll('meta');
    let metaTitle = '';
    let metaDescription = '';
    
    metaTags.forEach(tag => {
      const name = tag.getAttribute('name')?.toLowerCase();
      const property = tag.getAttribute('property')?.toLowerCase();
      
      if (name === 'title' || property === 'og:title') {
        metaTitle = tag.getAttribute('content') || '';
      }
      if (name === 'description' || property === 'og:description') {
        metaDescription = tag.getAttribute('content') || '';
      }
    });

    // Get a clean title - try to extract the main title without site name
    const rawTitle = document.title || metaTitle || '';

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
    
    // If we got very little content, use meta description as fallback
    const visibleContent = textContent.length > 100 ? textContent : metaDescription || textContent;

    // Fallback if we failed to extract meaningful content
    if (!title || !visibleContent || visibleContent.length < 50) {
      // Extract domain name for the title
      const domain = new URL(url).hostname.replace('www.', '');
      
      if (url.includes('pubs.acs.org')) {
        const doi = url.split('/').pop() || '';
        return {
          title: `ACS Publication: ${doi}`,
          summary: "This is a scientific article from the American Chemical Society. The content may require special access permissions."
        };
      }
      
      return {
        title: title || `Article from ${domain}`,
        summary: metaDescription || `This article from ${domain} requires special access. The content might be behind a paywall or requires specific permissions.`
      };
    }

    // Call Azure OpenAI API for summarization with improved prompt
    const endpoint = process.env.AZURE_OPENAI_API_BASE?.replace(/\/$/, "");
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

    if (!endpoint || !apiKey || !deploymentName) {
      console.error("Azure OpenAI API configuration is missing");
      return {
        title: title,
        summary: visibleContent.slice(0, 500) + "..." // Return first 500 chars as fallback
      };
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
              content: `Create a concise summary (maximum ${maxWords} words) of the following article. Focus only on the key information, main arguments, and essential details. The summary should be professional and focused without any introductory phrases like "This article discusses" or "Summary:", use English for the summary Language.
    
    Article title: ${title}
    Article content: ${visibleContent}
    
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
      return {
        title: title,
        summary: visibleContent.slice(0, 300) + "..." // Fallback if AI fails
      };
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
      title: jsonOutput.title || title,
      summary: jsonOutput.summary || visibleContent.slice(0, 300) + "...",
    };
  } catch (error) {
    console.error(`Error summarizing article ${url}:`, error);
    
    // Special handling for common error types
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      // For connection issues, return a friendly message
      const domain = url.includes('://') ? new URL(url).hostname : url.split('/')[0];
      return {
        title: `Article from ${domain.replace('www.', '')}`,
        summary: `Unable to access this article due to connection issues. The website might be temporarily unavailable or have strict access controls.`
      };
    }
    
    if (error.response && error.response.status === 403) {
      // For forbidden errors, likely a paywall
      const domain = url.includes('://') ? new URL(url).hostname : url.split('/')[0];
      return {
        title: `Article from ${domain.replace('www.', '')}`,
        summary: `This article appears to be behind a paywall or requires special access permissions. Consider accessing through your institution's subscription or searching for an open-access version.`
      };
    }
    
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SummaryResponse | ErrorResponse>
): Promise<void> {
  // Only allow POST requests for this endpoint
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Get the list of links from the request body
  const { links, maxConcurrent = 5, maxWords = 100 } = req.body;

  // print received links from API
  console.log("Received links:", links);

  // Validate the input
  if (!links || !Array.isArray(links) || links.length === 0) {
    return res.status(400).json({ error: "A valid array of link objects is required" });
  }

  try {
    console.log(`Processing ${links.length} links`);

    // Create a function to process links in batches to avoid overwhelming the server
    async function processBatch(batch: string[] | LinkInput[]): Promise<LinkOutput[]> {
      console.log(`Processing batch of ${batch.length} links`);

      return Promise.all(
        batch.map(async item => {
          try {
            // Handle both string URLs and object with url property
            const url = typeof item === 'string' ? item : item.url;
            const id = typeof item === 'string' ? undefined : item.id;
            
            console.log(`Processing link: ${url}`);
            const result = await extractAndSummarize(url, maxWords);

            if (result) {
              return {
                id,
                url,
                title: result.title,
                summary: result.summary,
              };
            } else {
              // For completely failed extractions, return an informative message
              const domain = url.includes('://') ? new URL(url).hostname.replace('www.', '') : url.split('/')[0];
              return {
                id,
                url,
                title: `Article from ${domain}`,
                summary: `Unable to extract content from this article. It may be behind a paywall, require special access, or the website structure may be incompatible with our extraction methods.`,
                error: "Failed to extract content",
              };
            }
          } catch (error) {
            const url = typeof item === 'string' ? item : item.url;
            const id = typeof item === 'string' ? undefined : item.id;
            
            console.error(`Error processing link ${url}:`, error);
            
            // Even on error, return something usable
            const domain = url.includes('://') ? new URL(url).hostname.replace('www.', '') : url.split('/')[0];
            return {
              id,
              url,
              title: `Article from ${domain}`,
              summary: `Unable to access or process this article. The website may have strict access controls, could be temporarily unavailable, or might use technologies that prevent automated access.`,
              error: error instanceof Error ? error.message : "Unknown error",
            };
          }
        })
      );
    }

    // Process links in batches to avoid overwhelming the server
    const results: LinkOutput[] = [];
    const maxBatchSize = Math.min(maxConcurrent, 10); // Limit concurrent requests

    // Create batches of links
    for (let i = 0; i < links.length; i += maxBatchSize) {
      const batch = links.slice(i, i + maxBatchSize);
      const batchResults = await processBatch(batch);
      results.push(...batchResults);
    }

    // Return the results
    return res.status(200).json({
      results: results,
    });
  } catch (error) {
    console.error("Error processing links:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return res.status(500).json({
      error: "Failed to process links",
      details: errorMessage,
    });
  }
}