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

    // Hit your n8n test webhook
    const response = await axios.post("https://n8n.energyinst.net/webhook/1549c858-5b73-4d57-af5e-f661cec72b5d", {
      url: searchUrl
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

    // n8n returns an array inside the first item because of how HTTP Request nodes output
    // We handle both direct array and n8n wrapped array
    let rawLinks =[];
    if (Array.isArray(response.data)) {
      rawLinks = response.data[0]?.links ||[];
    } else {
      rawLinks = response.data.links || [];
    }
    
    const links: string[] =[];

    rawLinks.forEach((rawHref: string) => {
      let cleanLink = rawHref;

      // Unpack Google Redirect Links
      if (cleanLink.includes("/url?q=")) {
        const match = cleanLink.match(/\/url\?q=([^&]+)/);
        if (match && match[1]) {
          cleanLink = decodeURIComponent(match[1]);
        }
      }

      // Filter Logic to remove all the Google junk
      if (
        cleanLink &&
        cleanLink.startsWith("http") &&
        !cleanLink.includes("google.com") && 
        !cleanLink.includes("google.co.uk") && 
        !cleanLink.includes("youtube.com") &&
        !cleanLink.includes("blogger.com") &&
        !cleanLink.includes("support.google") &&
        !cleanLink.includes("policies.google") &&
        !cleanLink.includes("accounts.google")
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
        console.log("--- DEBUG n8n RESPONSE ---");
        console.log("No valid links found. Raw response:", response.data);
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