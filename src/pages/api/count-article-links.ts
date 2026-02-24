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

   // --- NEW: UK Bypass Strategy ---
    // Keep the original UK search URL
    const fetchUrl = searchUrl;
    
    if (isDevelopment) console.log("Fetching UK URL:", fetchUrl);

    // Spoof Googlebot AND pass the EU/UK Consent cookies
    const response = await axios.get(fetchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "X-Forwarded-For": "66.249.66.1",
        "Cookie": "CONSENT=YES+cb.20230531-04-p0.en+FX+378; SOCS=CAESHAgBEhJnd3NfMjAyMzA4MTAtMF9SQzIaAmVuIAEaBgiA_LyaBg;"
      },
      timeout: 10000,
      validateStatus: (status) => status < 500,
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
    const links: string[] = [];

    // Fallback logic for container
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
        !cleanLink.includes("google.") && 
        !cleanLink.includes("youtube.com") &&
        !cleanLink.includes("blogger.com")
      ) {
        links.push(cleanLink);
      }
    });

    // Remove duplicates
    const uniqueLinks = [...new Set(links)];

    // Limit to top 10
    const topLinks = uniqueLinks.slice(0, 10);

    if (isDevelopment) {
      console.log(`Found ${topLinks.length} unique article links`);
      if (topLinks.length === 0) {
        console.log("--- DEBUG GOOGLE RESPONSE ---");
        console.log("Page Title:", $("title").text());
        console.log("-----------------------------");
      }
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