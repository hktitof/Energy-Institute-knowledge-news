import puppeteer from "puppeteer";
import { URL } from "url";
export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed", status: 405 });
    }
    // Get the URL from the query parameters
    const targetUrl = req.query.url;
    const forcePuppeteer = req.query.forcePuppeteer === "true";
    if (!targetUrl) {
        return res.status(400).json({ error: "Missing URL parameter", status: 400 });
    }
    try {
        // Parse and validate the URL
        const parsedUrl = new URL(targetUrl);
        // Security checks
        const hostname = parsedUrl.hostname;
        if (hostname === "localhost" ||
            hostname === "127.0.0.1" ||
            hostname.startsWith("192.168.") ||
            hostname.startsWith("10.") ||
            hostname.startsWith("172.16.")) {
            return res.status(403).json({
                error: "Access to internal networks is forbidden",
                status: 403,
            });
        }
        // Step 1: Try simple fetch first (unless puppeteer is forced)
        if (!forcePuppeteer) {
            try {
                const fetchResponse = await fetchWithTimeout(targetUrl, 5000);
                if (fetchResponse.ok) {
                    const contentType = fetchResponse.headers.get("content-type") || "";
                    // Only process HTML content
                    if (contentType.includes("text/html")) {
                        const html = await fetchResponse.text();
                        // Process HTML for iframe display
                        const processedHtml = processHtml(html, parsedUrl.origin);
                        return res.status(200).json({
                            html: processedHtml,
                            status: 200,
                            method: "fetch",
                        });
                    }
                }
                // If fetch doesn't work well, we'll fall through to puppeteer
            }
            catch (fetchError) {
                console.log("Simple fetch failed, falling back to puppeteer:", fetchError);
                // Continue to puppeteer approach
            }
        }
        // Step 2: If fetch failed or isn't suitable, use puppeteer
        return await puppeteerRender(targetUrl, res);
    }
    catch (error) {
        console.error("Preview API error:", error);
        res.status(500).json({
            error: `Failed to fetch content: ${error.message}`,
            status: 500,
        });
    }
}
// Helper function to fetch with timeout
async function fetchWithTimeout(url, timeoutMs) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            },
        });
        return response;
    }
    finally {
        clearTimeout(timeout);
    }
}
// Process HTML for iframe display
function processHtml(html, baseUrl) {
    return (html
        // Add base tag for relative URLs
        .replace(/<head>/i, `<head><base href="${baseUrl}/" target="_blank">`)
        // Add responsive styles
        .replace("</head>", `<style>
        body { max-width: 100%; overflow-x: hidden; }
        img, video, iframe { max-width: 100%; height: auto; }
      </style></head>`));
}
// Puppeteer rendering function
async function puppeteerRender(targetUrl, res) {
    let browser = null;
    try {
        // Launch puppeteer with minimal options
        browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
        });
        const page = await browser.newPage();
        // Set viewport size
        await page.setViewport({ width: 1280, height: 800 });
        // Use a shorter timeout
        await page.setDefaultNavigationTimeout(15000);
        // Simplified request interception - only block heavy media
        await page.setRequestInterception(true);
        page.on("request", request => {
            const resourceType = request.resourceType();
            if (resourceType === "media" ||
                resourceType === "font" ||
                (resourceType === "image" && !request.url().match(/\.(png|jpg|jpeg|gif|webp|ico|svg)$/i))) {
                request.abort();
            }
            else {
                request.continue();
            }
        });
        // Set browser headers
        await page.setExtraHTTPHeaders({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
        });
        // Navigate to the page with a more aggressive timeout
        const response = await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
        if (!response) {
            throw new Error("No response received from the page");
        }
        // Check status code
        const statusCode = response.status();
        if (statusCode >= 400) {
            throw new Error(`Page returned status code ${statusCode}`);
        }
        // Take a screenshot (smaller and faster)
        const screenshot = await page.screenshot({
            encoding: "base64",
            quality: 80,
            type: "jpeg",
        });
        // Simplified cookie acceptance - just most common patterns
        await page.evaluate(() => {
            const commonSelectors = [
                'button[id*="cookie"][id*="accept"]',
                'button[class*="cookie"][class*="accept"]',
                'button:contains("Accept")',
                ".cookie-accept",
                "#cookie-accept",
            ];
            for (const selector of commonSelectors) {
                try {
                    document.querySelectorAll(selector).forEach(el => {
                        if (el instanceof HTMLElement)
                            el.click();
                    });
                }
                catch (e) {
                    console.log("Error accepting cookies: ", e);
                }
            }
        });
        // Get content after a short delay for cookie banners
        await new Promise(resolve => setTimeout(resolve, 1000));
        const content = await page.content();
        // Simplified content processing
        const processedContent = content.replace(/<head>/i, '<head><base target="_blank">').replace("</head>", `<style>
          body { max-width: 100%; overflow-x: hidden; }
          img, video, iframe { max-width: 100%; height: auto; }
        </style></head>`);
        res.status(200).json({
            html: processedContent,
            screenshot: `data:image/jpeg;base64,${screenshot}`,
            status: 200,
            method: "puppeteer",
        });
    }
    catch (error) {
        console.error("Puppeteer rendering error:", error);
        res.status(500).json({
            error: `Puppeteer rendering failed: ${error.message}`,
            status: 500,
        });
    }
    finally {
        if (browser) {
            await browser.close();
        }
    }
}
