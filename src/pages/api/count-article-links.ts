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
        // Use a generic Desktop User-Agent
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        // CRITICAL: Bypass Google Consent Screen (UK/EU)
        Cookie: "CONSENT=YES+;",
      },
      timeout: 10000,
      validateStatus: (status) => status < 500,
    });

    // Check if we got a valid response
    if (response.status !== 200) {
      if (isDevelopment)
        console.error("Non-200 status from Google:", response.status);
      return res.status(response.status).json({
        error: "Failed to fetch from Google",
        details: `Status code: ${response.status}`,
      });
    }

    // Parse the HTML response with cheerio
    const $ = load(response.data);
    const links: string[] = [];

    // Strategy: Look inside the main search container (#search) first to avoid footer/nav links
    // If #search is empty (sometimes happens in mobile view), fallback to body
    const container = $("#search").length > 0 ? $("#search") : $("body");

    container.find("a").each((_, element) => {
      const rawHref = $(element).attr("href");
      if (!rawHref) return;

      let cleanLink = "";

      // Case 1: Direct Link
      if (rawHref.startsWith("http")) {
        cleanLink = rawHref;
      }
      // Case 2: Google Redirect Link (/url?q=...)
      else if (rawHref.startsWith("/url?q=")) {
        const match = rawHref.match(/\/url\?q=([^&]+)/);
        if (match && match[1]) {
          cleanLink = decodeURIComponent(match[1]);
        }
      }

      // Filter Logic
      if (
        cleanLink &&
        cleanLink.startsWith("http") &&
        !cleanLink.includes("google.") && // Blocks google.com, google.co.uk, etc.
        !cleanLink.includes("youtube.com") &&
        !cleanLink.includes("blogger.com")
      ) {
        links.push(cleanLink);
      }
    });

    // Remove duplicates
    const uniqueLinks = [...new Set(links)];

    // Limit to top 10 to match your "last 10 articles" requirement
    const topLinks = uniqueLinks.slice(0, 10);

    if (isDevelopment)
      console.log(`Found ${topLinks.length} unique article links`);

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