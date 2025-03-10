// File: pages/api/preview-advanced.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import puppeteer from 'puppeteer';
import { URL } from 'url';

type ProxyResponse = {
  html?: string;
  screenshot?: string;
  error?: string;
  status: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProxyResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed', status: 405 });
  }

  // Get the URL from the query parameters
  const targetUrl = req.query.url as string;

  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing URL parameter', status: 400 });
  }

  let browser = null;

  try {
    // Parse and validate the URL
    const parsedUrl = new URL(targetUrl);
    
    // Security checks
    const hostname = parsedUrl.hostname;
    if (
      hostname === 'localhost' || 
      hostname === '127.0.0.1' || 
      hostname.startsWith('192.168.') || 
      hostname.startsWith('10.') || 
      hostname.startsWith('172.16.')
    ) {
      return res.status(403).json({ 
        error: 'Access to internal networks is forbidden', 
        status: 403 
      });
    }

    // Launch puppeteer browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Set viewport size
    await page.setViewport({
      width: 1280,
      height: 800
    });
    
    // Set a reasonable timeout
    await page.setDefaultNavigationTimeout(30000);
    
    // Optionally block certain resource types to speed up loading
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      if (['media', 'font', 'websocket'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });
    
    // Add headers to appear more like a real browser
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    });
    
    // Navigate to the page
    const response = await page.goto(targetUrl, {
      waitUntil: 'networkidle2'
    });
    
    if (!response) {
      throw new Error('No response received from the page');
    }
    
    // Check if the navigation was successful
    const statusCode = response.status();
    if (statusCode >= 400) {
      throw new Error(`Page returned status code ${statusCode}`);
    }
    
    // Take a screenshot as a fallback in case the HTML doesn't render properly
    const screenshot = await page.screenshot({ encoding: 'base64', fullPage: false });
    
    // Get the page content
    const content = await page.content();
    
    // Process the content to work better in an iframe
    const processedContent = content
      // Add base target to open links in new tab
      .replace(/<head>/i, '<head><base target="_blank">')
      // Add responsive styles
      .replace('</head>', `<style>
        body { max-width: 100%; overflow-x: hidden; }
        img, video, iframe { max-width: 100%; height: auto; }
      </style></head>`);
    
    res.status(200).json({
      html: processedContent,
      screenshot: `data:image/png;base64,${screenshot}`,
      status: 200
    });
  } catch (error) {
    console.error('Puppeteer proxy error:', error);
    res.status(500).json({ 
      error: `Failed to fetch content: ${(error as Error).message}`, 
      status: 500 
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}