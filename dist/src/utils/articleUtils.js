import axios from "axios";
import { JSDOM } from "jsdom";
import retry from "async-retry";
// Add this at the top of your file
const isDevelopment = process.env.NODE_ENV !== "production";
export async function extractAndSummarize(url, maxWords = 100) {
    try {
        // Fetch the HTML content with retry logic
        const response = await retry(async () => {
            return await axios.get(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.5",
                },
                timeout: 15000,
            });
        }, {
            retries: 1, // Retry up to 1 time
            minTimeout: 1000, // Start with 1-second delay
            factor: 2, // Exponential backoff
            onRetry: (error) => {
                console.log(`Retrying ${url} due to error: ${error.message}`);
            },
        });
        // Parse the HTML using JSDOM
        const dom = new JSDOM(response.data, { url });
        const document = dom.window.document;
        // Extract all visible text
        function extractAllVisibleText(doc) {
            const scripts = doc.querySelectorAll("script, style, noscript, svg, head");
            scripts.forEach(el => el.remove());
            function extractTextFromNode(node) {
                if (node.nodeType === node.TEXT_NODE) {
                    return node.textContent?.trim() || "";
                }
                if (node.nodeType !== node.ELEMENT_NODE) {
                    return "";
                }
                const element = node;
                const hasHiddenAttr = element.hasAttribute("hidden") ||
                    element.getAttribute("aria-hidden") === "true" ||
                    element.getAttribute("style")?.includes("display: none") ||
                    element.getAttribute("style")?.includes("visibility: hidden");
                if (hasHiddenAttr) {
                    return "";
                }
                let textContent = "";
                for (let i = 0; i < node.childNodes.length; i++) {
                    textContent += extractTextFromNode(node.childNodes[i]) + " ";
                }
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
            const bodyText = extractTextFromNode(doc.body);
            return bodyText
                .replace(/\n{3,}/g, "\n\n")
                .replace(/\s+/g, " ")
                .replace(/\n +/g, "\n")
                .replace(/ +\n/g, "\n")
                .split("\n")
                .map(line => line.trim())
                .filter(line => line)
                .join("\n")
                .trim();
        }
        // Extract and clean the title
        const rawTitle = document.title || "";
        const h1Elements = document.querySelectorAll("h1");
        const mainHeading = h1Elements.length > 0 ? h1Elements[0].textContent?.trim() || "" : "";
        let title = mainHeading || rawTitle;
        title = title.replace(/\s*[|\-–—]\s*[^|\-–—]+$/, "").trim();
        if (!title || title.length < 5) {
            title = rawTitle.split(/[|\-–—]/)[0].trim();
        }
        // Extract text content
        const textContent = extractAllVisibleText(document);
        // For Azure deployments, you may need a different approach to summarization
        // If Azure OpenAI isn't working reliably, consider:
        // 1. Using a simpler extraction-based summary
        // 2. Using the first few sentences (e.g., 3-5) as a summary
        // 3. Using a fallback summarization service
        // Simple extraction-based summary (first 100 words)
        const words = textContent.split(/\s+/);
        const summary = words.slice(0, maxWords).join(" ") + (words.length > maxWords ? "..." : "");
        // Return the title and summary
        return {
            title,
            summary,
        };
    }
    catch (error) {
        // Enhanced error handling with specific placeholders
        if (axios.isAxiosError(error) && error.response && error.response.status === 403) {
            return { title: "Access Denied", summary: "Unable to fetch content due to access restrictions." };
        }
        else if (error instanceof Error &&
            ["ECONNRESET", "ETIMEDOUT", "ECONNABORTED"].includes(error.code || "")) {
            return { title: "Fetch Error", summary: "Unable to fetch content due to network issues." };
        }
        else {
            if (isDevelopment)
                console.error(`Error summarizing article ${url}:`, error);
            return { title: "Error", summary: "Failed to process article." };
        }
    }
}
