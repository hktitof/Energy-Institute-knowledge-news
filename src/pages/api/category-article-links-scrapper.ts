// pages/api/category-article-links-scrapper.ts
import axios from "axios";
import { load } from "cheerio";
// import { v4 as uuidv4 } from "uuid";
import { NextApiRequest, NextApiResponse } from "next";
import { Article } from "@/utils/utils";

interface NewsResponse {
  articles: Article[];
}

interface ErrorResponse {
  error: string;
  details?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<NewsResponse | ErrorResponse>
): Promise<void> {
  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url } = req.query;

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
