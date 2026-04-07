/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { NextApiRequest, NextApiResponse } from "next";

interface CountLinksResponse {
  count: number;
  links: string[];
}

interface ErrorResponse {
  error: string;
  details?: string;
}

const isDevelopment = process.env.NODE_ENV !== "production";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CountLinksResponse | ErrorResponse>
): Promise<void> {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { searchUrl } = req.body;

    if (!searchUrl || typeof searchUrl !== "string") {
      return res.status(400).json({ error: "Search URL is required" });
    }

    if (isDevelopment) console.log("Sending Google URL to n8n webhook:", searchUrl);

    // Extract the actual search query from the Google URL
    let searchQuery = searchUrl;
    try {
      if (searchUrl.startsWith("http")) {
        const urlObj = new URL(searchUrl);
        searchQuery = urlObj.searchParams.get("q") || searchUrl;
      }
    } catch {
        // Ignore URL parse errors
        
    }

    if (isDevelopment) console.log("Extracted Query for RSS Scraper:", searchQuery);

    // Hit your NEW production n8n webhook (Google News RSS Scraper)
    const webhookUrl = process.env.N8N_GOOGLE_NEWS_WEBHOOK;

    const resolveWebhookUrl = process.env.N8N_RESOLVE_NEWS_WEBHOOK;
    
    if (!resolveWebhookUrl) {
      throw new Error("Missing N8N_RESOLVE_NEWS_WEBHOOK in environment variables");
    }
    
    if (!webhookUrl) {
      throw new Error("Missing N8N_GOOGLE_NEWS_WEBHOOK in environment variables");
    }

    // Hit your NEW production n8n webhook (Google News RSS Scraper)
    const response = await axios.post(webhookUrl, {
      query: searchQuery,
      count: 10,
      time: "7d",
      resolve_urls: true
    }, {
      timeout: 90000,
      validateStatus: (status) => status < 500
    });

    if (response.status !== 200) {
      if (isDevelopment) console.error("n8n API Error:", response.data);
      return res.status(response.status).json({
        error: "Failed to fetch from n8n API",
        details: response.data?.error || "Unknown error",
      });
    }

    // Parse the articles from the new Python script output
    const articles = response.data.articles ||[];
    
    const resolvedLinksPromises = articles.map(async (article: any) => {
      let finalLink = article.link; // Default to the Google News link

      // Check if real_url is present and actually a "real" URL (not another Google link)
      const isRealUrlProvided = article.real_url && !article.real_url.includes("news.google.com");
      
      if (isRealUrlProvided) {
        finalLink = article.real_url;
        if (isDevelopment) console.log("Using provided real_url:", finalLink);
      } else if (article.link && article.link.includes("news.google.com/rss/articles")) {
        // If not a real_url, and it's a Google RSS link, attempt to resolve it
        if (isDevelopment) console.log("Resolving Google RSS link:", article.link);
        try {
          const resolveResponse = await axios.post(resolveWebhookUrl, {
            url: article.link
          }, {
            timeout: 20000, // 10 seconds for individual resolution
            validateStatus: (status) => status < 500
          });

          if (resolveResponse.status === 200 && resolveResponse.data.success && resolveResponse.data.real_url) {
            finalLink = resolveResponse.data.real_url;
            if (isDevelopment) console.log("Resolved to:", finalLink);
          } else {
            if (isDevelopment) console.warn("Failed to resolve link, using original:", article.link, resolveResponse.data);
          }
        } catch (resolveError) {
          if (isDevelopment) console.error("Error calling resolve webhook:", resolveError);
        }
      }
      return finalLink;
    });

    const allLinks = await Promise.all(resolvedLinksPromises);
    
    // Filter out any potential empty or failed resolutions and clean up Google junk
    const links: string[] = allLinks.filter(link => 
      link && 
      link.startsWith("http") &&
      !link.includes("google.com/sorry") && // Filter out CAPTCHA pages
      !link.includes("google.com/policies") &&
      !link.includes("google.com/support") &&
      !link.includes("youtube.com") &&
      !link.includes("blogger.com") &&
      !link.includes("accounts.google")
    );

    // Remove duplicates (though your python script already handles this)
    const uniqueLinks = [...new Set(links)];
    const topLinks = uniqueLinks.slice(0, 10);

    if (isDevelopment) {
      console.log(`Found ${topLinks.length} unique article links`);
    }

    // Return the count and links
    return res.status(200).json({
      count: topLinks.length,
      links: topLinks,
    });
  } catch (error: unknown) {
    if (isDevelopment) console.error("Error counting links:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return res.status(500).json({
      error: "Failed to count links",
      details: errorMessage,
    });
  }
}