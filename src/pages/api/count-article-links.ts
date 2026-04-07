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
      timeout: 45000,
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
    
    const links: string[] =[];
    articles.forEach((article: any) => {
      // Use real_url if resolved, otherwise fallback to the Google News link
      const urlToUse = article.real_url || article.link;
      if (urlToUse) {
        links.push(urlToUse);
      }
    });

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