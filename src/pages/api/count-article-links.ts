import axios from "axios";
import { load } from "cheerio";
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

    if (isDevelopment) console.log("Counting links from URL:", searchUrl);

    // Fetch the Google News search results page
    const response = await axios.get(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      timeout: 10000,
      validateStatus: status => status < 500,
    });

    // Check if we got a valid response
    if (response.status !== 200) {
      if (isDevelopment) console.error("Non-200 status from Google:", response.status);
      return res.status(response.status).json({
        error: "Failed to fetch from Google",
        details: `Status code: ${response.status}`,
      });
    }

    // Parse the HTML response with cheerio
    const $ = load(response.data);

    // Try different selectors for Google News articles
    const selectors = [
      "div.SoaBEf a",
      "div.WlydOe a",
      "div.v7W49e a",
      "g-card a",
    ];

    const links: string[] = [];
    let foundArticles = false;

    for (const selector of selectors) {
      $(selector).each((index: number, element: cheerio.Element) => {
        const href: string | undefined = $(element).attr("href");
        if (href && href.startsWith("http") && !href.includes("google.com")) {
          links.push(href);
          foundArticles = true;
        }
      });

      if (foundArticles) break;
    }

    // If no articles found with any selector, try a more generic approach
    if (links.length === 0) {
      $("a").each((index: number, element: cheerio.Element) => {
        const href: string | undefined = $(element).attr("href");
        if (
          href &&
          href.startsWith("http") &&
          !href.includes("google.com") &&
          !href.includes("gstatic.com") &&
          !href.includes("googleapis.com")
        ) {
          links.push(href);
        }
      });
    }

    // Remove duplicates
    const uniqueLinks = [...new Set(links)];

    if (isDevelopment) console.log(`Found ${uniqueLinks.length} unique article links`);

    // Return the count and links
    return res.status(200).json({
      count: uniqueLinks.length,
      links: uniqueLinks,
    });
  } catch (error: unknown) {
    if (isDevelopment) console.error("Error counting links:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return res.status(500).json({
      error: "Failed to count links",
      details: errorMessage,
    });
  }
}