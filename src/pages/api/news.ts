// pages/api/news.js
import fetch from "node-fetch"; // Not needed in Node 18+ if using global fetch
import { NextApiRequest, NextApiResponse } from "next";

const generateGoogleNewsLink = (theme: string): string => {
  // Replace with your own URL generation logic.
  return `https://news.google.com/search?q=${encodeURIComponent(theme)}`;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let { theme } = req.query;
  if (Array.isArray(theme)) {
    theme = theme.join(" ");
  }

  if (!theme) {
    return res.status(400).json({ error: "Theme parameter is required" });
  }

  try {
    const url = generateGoogleNewsLink(theme);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to fetch news");
    }
    const htmlText = await response.text();
    // Optionally, you can parse the HTML here using a library like cheerio
    // and extract the paragraphs if you wish to process it on the server.
    res.status(200).json({ html: htmlText });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "An unknown error occurred" });
    }
  }
}
