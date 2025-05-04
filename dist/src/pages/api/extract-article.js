// pages/api/extract-article.ts
import axios from "axios";
import { JSDOM } from "jsdom";
export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed", success: false });
    }
    const { url } = req.body;
    if (!url) {
        return res.status(400).json({ error: "URL is required", success: false });
    }
    try {
        // Fetch the HTML content
        const response = await axios.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
            },
            timeout: 15000,
        });
        // Parse the HTML using JSDOM
        const dom = new JSDOM(response.data, { url });
        const document = dom.window.document;
        // Extract all visible text from the document
        function extractAllVisibleText(doc) {
            // Remove all script and style elements
            const scripts = doc.querySelectorAll("script, style, noscript, svg, head");
            scripts.forEach(el => el.remove());
            // Function to recursively extract text from nodes
            function extractTextFromNode(node) {
                // Text node - return its content
                if (node.nodeType === node.TEXT_NODE) {
                    return node.textContent?.trim() || "";
                }
                // Not an element node
                if (node.nodeType !== node.ELEMENT_NODE) {
                    return "";
                }
                const element = node;
                // Skip hidden elements
                const hasHiddenAttr = element.hasAttribute("hidden") ||
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
        // Get the page title
        const title = document.title || new URL(url).pathname.split("/").pop()?.replace(/-/g, " ") || url;
        // Extract all visible text
        const textContent = extractAllVisibleText(document);
        // Return the extracted text
        res.status(200).json({
            success: true,
            url: url,
            title: title,
            textContent: textContent,
            length: textContent.length,
        });
    }
    catch (error) {
        console.error("Error extracting article:", error);
        const errorMessage = axios.isAxiosError(error) && error.response
            ? `Error ${error.response.status}: ${error.response.statusText}`
            : error.message;
        res.status(500).json({
            success: false,
            error: errorMessage,
        });
    }
}
