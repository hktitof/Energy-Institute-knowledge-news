// File: pages/api/preview-advanced.ts
import type { NextApiRequest, NextApiResponse } from "next";
import puppeteer, { Page } from "puppeteer";
import { URL } from "url";

type ProxyResponse = {
  html?: string;
  screenshot?: string;
  error?: string;
  status: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ProxyResponse>) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed", status: 405 });
  }

  // Get the URL from the query parameters
  const targetUrl = req.query.url as string;

  if (!targetUrl) {
    return res.status(400).json({ error: "Missing URL parameter", status: 400 });
  }

  let browser = null;

  try {
    // Parse and validate the URL
    const parsedUrl = new URL(targetUrl);

    // Security checks
    const hostname = parsedUrl.hostname;
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.16.")
    ) {
      return res.status(403).json({
        error: "Access to internal networks is forbidden",
        status: 403,
      });
    }

    // Launch puppeteer browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
        "--disable-web-security", // Add this line
        "--enable-features=NetworkService,NetworkServiceInProcess",
      ],
    });

    const page = await browser.newPage();

    // Set viewport size
    await page.setViewport({
      width: 1280,
      height: 800,
    });

    // Set a reasonable timeout
    await page.setDefaultNavigationTimeout(30000);

    // Extract cookies from request if they exist
    const cookies = req.cookies;
    if (cookies) {
      try {
        // Convert cookies to format expected by Puppeteer
        const puppeteerCookies = Object.entries(cookies).map(([name, value]) => ({
          name,
          value: value?.toString() || "", // Ensure value is a string
          domain: parsedUrl.hostname, // Use only the hostname without subdomain restrictions
          path: "/",
          // Avoid adding optional fields that might cause validation errors
        }));

        // Set cookies in the browser
        if (puppeteerCookies.length > 0) {
          await page.setCookie(...puppeteerCookies);
        }
      } catch (cookieError) {
        console.error("Error setting cookies:", cookieError);
        // Continue execution even if cookies fail
      }
    }

    // Intercept only specific resource types instead of blocking all
    await page.setRequestInterception(true);
    page.on("request", request => {
      // Only block large media files that might cause performance issues
      const resourceType = request.resourceType();
      if (resourceType === "media" && request.url().match(/\.(mp4|webm|ogg|avi|mov)$/i)) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Add headers to appear more like a real browser
    await page.setExtraHTTPHeaders({
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    });

    // Navigate to the page
    const response = await page.goto(targetUrl, {
      waitUntil: "networkidle2",
    });

    if (!response) {
      throw new Error("No response received from the page");
    }

    // Check if the navigation was successful
    const statusCode = response.status();
    if (statusCode >= 400) {
      throw new Error(`Page returned status code ${statusCode}`);
    }

    // Take a screenshot as a fallback in case the HTML doesn't render properly
    const screenshot = await page.screenshot({ encoding: "base64", fullPage: false });

    // Try to auto-accept cookie notices before getting content
    await autoAcceptCookieNotices(page);

    // Get the page content
    const content = await page.content();

    // Process the content to work better in an iframe
    const processedContent = content
      // Add base target to open links in new tab
      .replace(/<head>/i, '<head><base target="_blank">')
      // Add responsive styles
      .replace(
        "</head>",
        `<style>
        body { max-width: 100%; overflow-x: hidden; }
        img, video, iframe { max-width: 100%; height: auto; }
      </style></head>`
      )
      // Add script to handle cookie interactions
      .replace(
        "</body>",
        `
        <script>
          // Script to help handle cookie buttons
          document.addEventListener('DOMContentLoaded', function() {
            // Auto-click common cookie accept buttons
            const cookieSelectors = [
              'button[id*="cookie"][id*="accept"]',
              'button[class*="cookie"][class*="accept"]',
              'button[id*="cookie"][id*="agree"]',
              'button[class*="cookie"][class*="agree"]',
              'a[id*="cookie"][id*="accept"]',
              'a[class*="cookie"][class*="accept"]',
              'div[id*="cookie"][id*="accept"]',
              'div[class*="cookie"][class*="accept"]',
              'button[id*="gdpr"][id*="accept"]',
              'button[class*="gdpr"][class*="accept"]',
              'button:contains("Accept")',
              'button:contains("Accept All")',
              'button:contains("I Accept")',
              'button:contains("OK")',
              'button:contains("Accept Cookies")',
              'button:contains("Got it")',
              '.cookie-accept',
              '#cookie-accept',
              '.cookie-notice-accept'
            ];
            
            cookieSelectors.forEach(selector => {
              try {
                const buttons = document.querySelectorAll(selector);
                if(buttons.length > 0) {
                  buttons.forEach(button => {
                    button.click();
                  });
                }
              } catch(e) {}
            });
          });
        </script>
      </body>`
      );

    // Get the cookies after page load
    const pageCookies = await page.cookies();

    // Set cookies in the response - with simplified approach
    if (pageCookies.length > 0) {
      try {
        pageCookies.forEach(cookie => {
          // Use a simpler cookie format to avoid validation errors
          const cookieString = `${cookie.name}=${cookie.value}; Path=${cookie.path || "/"}`;
          res.setHeader("Set-Cookie", cookieString);
        });
      } catch (cookieError) {
        console.error("Error setting response cookies:", cookieError);
        // Continue execution even if setting cookies fails
      }
    }

    res.status(200).json({
      html: processedContent,
      screenshot: `data:image/png;base64,${screenshot}`,
      status: 200,
    });
  } catch (error) {
    console.error("Puppeteer proxy error:", error);
    res.status(500).json({
      error: `Failed to fetch content: ${(error as Error).message}`,
      status: 500,
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Helper function to attempt to auto-accept cookie notices
// In preview-advanced.ts, simplify the cookie handling:
async function autoAcceptCookieNotices(page: Page) {
  try {
    // Add a delay to allow cookie banners to appear
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Use a more targeted approach with fewer selectors
    const cookieSelectors = [
      'button[id*="accept"], button[class*="accept"]',
      'button[id*="agree"], button[class*="agree"]',
      'button:contains("Accept"), button:contains("Accept All")',
      ".cookie-accept, #cookie-accept",
    ];

    for (const selector of cookieSelectors) {
      try {
        const buttonCount = await page.evaluate(sel => {
          const buttons = document.querySelectorAll<HTMLElement>(sel);
          buttons.forEach(btn => btn.click());
          return buttons.length;
        }, selector);

        if (buttonCount > 0) {
          console.log(`Clicked ${buttonCount} cookie buttons with selector: ${selector}`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (e: unknown) {
        console.error(`Error clicking cookie button with selector: ${selector}`, e);
        continue;
      }
    }
  } catch (error) {
    console.error("Error auto-accepting cookies:", error);
  }
}
