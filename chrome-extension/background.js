// background.js

// --- VERY IMPORTANT: Correct this based on your ACTUAL Next.js server ---
// --- Common setup: http, port 3000, path matching api filename ---
const API_ENDPOINT = "http://localhost:3000/api/extension-summarize-content"; // <-- VERIFY & CHANGE THIS

let currentProcessingQueue = [];
let isProcessing = false;

// --- Listener for messages from Popup ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "FETCH_ARTICLES" && sender.tab === undefined) {
        console.log("Background received FETCH_ARTICLES:", message.urls);
        currentProcessingQueue = message.urls;
        if (!isProcessing) {
            processQueue();
        }
        sendResponse({ status: "received" });
        return true;
    }
    return false;
});

async function processQueue() {
    if (isProcessing || currentProcessingQueue.length === 0) {
        isProcessing = false;
        if (currentProcessingQueue.length === 0 && !isProcessing) {
             // Ensure completion message is sent if queue was emptied but not processed
             sendMessageToPopup({
                 type: 'PROCESSING_COMPLETE',
                 text: `Finished processing all URLs.`
             });
             console.log("Background processing queue was already empty or finished.");
        }
        return;
    }

    isProcessing = true;
    const url = currentProcessingQueue.shift();
    const originalTotalUrls = currentProcessingQueue.length + 1; // Use a fixed total for progress calc
    const processedCount = originalTotalUrls - currentProcessingQueue.length;

    sendMessageToPopup({
        type: "UPDATE_STATUS",
        text: `Starting URL ${processedCount}/${originalTotalUrls}: ${getShortUrl(url)}...`,
        level: "info",
        progress: Math.round(((processedCount - 1) / originalTotalUrls) * 100),
    });

    let tabId = null;
    try {
        // 1. Open Tab
        sendMessageToPopup({ type: "UPDATE_STATUS", text: `Opening tab for ${getShortUrl(url)}...`, level: "info" });
        console.log(`Attempting to open tab for: ${url}`);
        tabId = await openTabAndWait(url);
        if (!tabId) throw new Error("Failed to create or load tab.");
        console.log(`Tab ${tabId} opened and loaded for: ${url}`);

        // 2. Get Content
        sendMessageToPopup({ type: "UPDATE_STATUS", text: `Extracting content from ${getShortUrl(url)}...`, level: "info" });
        console.log(`Attempting to get content from tab: ${tabId}`);
        const contentResult = await getContentFromTab(tabId);
        if (!contentResult || !contentResult.content) {
             throw new Error("Failed to extract content from tab (contentResult is null or empty).");
        }
        console.log(`Content extracted from tab ${tabId}, length: ${contentResult.content.length}`);

        // 3. Close Tab (BEFORE API call)
        sendMessageToPopup({ type: "UPDATE_STATUS", text: `Closing tab for ${getShortUrl(url)}...`, level: "info" });
        console.log(`Attempting to close tab: ${tabId}`);
        await closeTab(tabId);
        const closedTabId = tabId; // Keep for logging
        tabId = null; // Reset tabId
        console.log(`Tab ${closedTabId} closed.`);

        // 4. Call API
        sendMessageToPopup({
            type: "UPDATE_STATUS",
            text: `Sending content to API for ${getShortUrl(url)}...`,
            level: "info",
            progress: Math.round(((processedCount - 0.5) / originalTotalUrls) * 100),
        });
        console.log(`Calling API endpoint: ${API_ENDPOINT} for url: ${url}`);
        const apiResponse = await callSummarizeApi(contentResult.content, url);
        console.log(`API response received for ${url}:`, apiResponse);


        // 5. Send result to popup
        sendMessageToPopup({
            type: "ADD_RESULT",
            data: {
                title: apiResponse.title || contentResult.title || "N/A",
                summary: apiResponse.summary,
                url: url,
            },
        });
        sendMessageToPopup({
            type: "UPDATE_STATUS",
            text: `Successfully summarized: ${getShortUrl(url)}`,
            level: "success",
            progress: Math.round((processedCount / originalTotalUrls) * 100),
        });

    } catch (error) { // ***** CORRECTED CATCH BLOCK *****
        console.error(`>>> Error processing URL ${url}:`, error); // Log the full error object
        console.error(">>> Error Name:", error.name);
        console.error(">>> Error Message:", error.message);
        console.error(">>> Error Stack:", error.stack); // Log stack trace if available

        sendMessageToPopup({
            type: "ADD_RESULT",
            data: {
                title: `Error for ${getShortUrl(url)}`,
                // Provide a more informative error message if possible
                summary: `Processing failed: ${error.message || "Unknown error occurred"}`,
                url: url,
                error: true,
            },
        });
        sendMessageToPopup({
            type: "UPDATE_STATUS",
            text: `Failed to process: ${getShortUrl(url)}`, // Simplified error message for status bar
            level: "error",
            progress: Math.round((processedCount / originalTotalUrls) * 100),
        });

        // Ensure tab is closed even if error occurred mid-process
        if (tabId) {
            console.log(`Closing tab ${tabId} due to error.`);
            await closeTab(tabId);
        }
    } finally {
        // Process next item in queue after a short delay
        console.log(`Waiting before processing next URL (if any)...`);
        await new Promise(resolve => setTimeout(resolve, 750));
        isProcessing = false; // Allow next item to start
        processQueue(); // Trigger next iteration (will check if queue is empty)
    }
}

// --- Helper Functions --- (openTabAndWait, getContentFromTab, closeTab, callSummarizeApi, sendMessageToPopup, getShortUrl - KEEP AS THEY WERE, but ensure callSummarizeApi uses the CORRECTED API_ENDPOINT)

// --- Ensure callSummarizeApi uses the corrected endpoint ---
async function callSummarizeApi(htmlContent, url) {
    try {
        // API_ENDPOINT is used here - make sure it's correct!
        const response = await fetch(API_ENDPOINT, {
             method: "POST",
             headers: {
                 "Content-Type": "application/json",
             },
             body: JSON.stringify({
                 htmlContent: htmlContent,
                 url: url,
                 maxWords: 150,
             }),
             // Optional: Add a timeout for the API call itself
             // signal: AbortSignal.timeout(30000) // 30 seconds timeout
         });

         // ... rest of callSummarizeApi ...
        if (!response.ok) {
            let errorMsg = `API request failed with status ${response.status}`;
            let errorData = null;
            try {
                errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            } catch {
                try {
                     // If not JSON, try getting text
                    const textError = await response.text();
                    errorMsg += ` - ${textError.substring(0, 100)}`; // Add snippet of text error
                } catch {}
            }
            console.error(`API Error Data for ${url}:`, errorData);
            throw new Error(errorMsg);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || "API returned success:false");
        }
        console.log(`API success for ${url}`);
        return result;

    } catch (error) {
        console.error(`API call failed for ${url}:`, error);
        // Distinguish network errors from API logic errors
        let specificErrorMsg = error.message;
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
             specificErrorMsg = `Network error or incorrect API endpoint (${API_ENDPOINT}). Check API server status and URL.`;
        } else if (error.name === 'AbortError') {
            specificErrorMsg = 'API call timed out.';
        }
        throw new Error(`API communication error: ${specificErrorMsg}`);
    }
}


// Opens a tab and waits for it to be 'complete'
function openTabAndWait(url, timeout = 20000) {
  // 20 second timeout
  return new Promise(async (resolve, reject) => {
    let tabId = null;
    let timedOut = false;
    let listenerAttached = false; // Flag to prevent double removal

    const timeoutId = setTimeout(() => {
      timedOut = true;
      console.error(`Tab loading timed out for ${url}`);
       if (listenerAttached) {
           try { chrome.tabs.onUpdated.removeListener(listener); } catch {}
           listenerAttached = false;
       }
      reject(new Error(`Tab loading timed out after ${timeout / 1000} seconds for ${url}`));
      // Try to close the timed-out tab
      if(tabId) {
          console.log(`Attempting to close timed-out tab ${tabId}`);
          closeTab(tabId).catch(e => console.warn(`Failed to close timed-out tab ${tabId}: ${e.message}`));
      }
    }, timeout);

    const listener = (updatedTabId, changeInfo) => {
        // Only listen for updates on the specific tab we opened
      if (updatedTabId === tabId) {
           console.log(`Tab Update listener: tabId=${updatedTabId}, status=${changeInfo.status}`); // Add logging
          if (changeInfo.status === "complete") {
              if (!timedOut) {
                  clearTimeout(timeoutId);
                   if (listenerAttached) {
                       try { chrome.tabs.onUpdated.removeListener(listener); } catch {}
                       listenerAttached = false;
                   }
                  console.log(`Tab ${tabId} reported status 'complete' for ${url}`);
                  // Add a small extra delay - sometimes 'complete' fires slightly before everything is truly ready for scripting
                  setTimeout(() => resolve(tabId), 250);
              }
              // else: timeout already handled
          }
          // Handle cases where the tab fails to load
          else if (changeInfo.status === 'error' || (changeInfo.error && updatedTabId === tabId)) {
               if (!timedOut) {
                  clearTimeout(timeoutId);
                   if (listenerAttached) {
                       try { chrome.tabs.onUpdated.removeListener(listener); } catch {}
                       listenerAttached = false;
                   }
                  console.error(`Tab ${tabId} encountered an error during loading: ${changeInfo.error || 'unknown error'}`);
                  reject(new Error(`Tab failed to load: ${changeInfo.error || 'unknown error'}`));
                   // Try to close the errored tab
                   closeTab(tabId).catch(e => console.warn(`Failed to close errored tab ${tabId}: ${e.message}`));
               }
           }
      }
    };

    try {
        console.log(`Adding onUpdated listener for ${url}`);
        chrome.tabs.onUpdated.addListener(listener);
        listenerAttached = true;
        console.log(`Creating tab for ${url}`);
        const tab = await chrome.tabs.create({ url: url, active: false });
        tabId = tab.id;
        console.log(`Created tab ${tabId} for ${url}`);
        if (!tabId) {
             throw new Error("chrome.tabs.create did not return a valid tab ID.");
        }
    } catch (error) {
        console.error(`Error during tab creation or listener setup for ${url}:`, error);
         clearTimeout(timeoutId);
         if (listenerAttached) {
             try { chrome.tabs.onUpdated.removeListener(listener); } catch {}
         }
         reject(new Error(`Error creating tab for ${url}: ${error.message}`));
    }
  });
}

// Injects script to get content
async function getContentFromTab(tabId) {
  try {
    console.log(`Executing script in tab ${tabId}`);
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        // This function runs in the content script context
        // Add error handling *inside* the injected function
        try {
            // Check if document and body exist
            if (!document || !document.documentElement) {
                 return { error: "Document or documentElement not available." };
            }
             return {
                content: document.documentElement.outerHTML || "", // Ensure content is always a string
                title: document.title || "", // Ensure title is always a string
                url: window.location.href
             };
        } catch (e) {
             return { error: `Error inside injected script: ${e.message}` };
        }
      },
       // Optional: Increase timeout for script execution on slow pages
       // injectionTimeout: 10000 // 10 seconds
    });
    console.log(`Script execution result for tab ${tabId}:`, results);

    // Check results structure carefully
    if (!results || results.length === 0) {
         throw new Error("Script injection returned no results.");
    }
    const primaryResult = results[0].result;
    if (!primaryResult) {
         throw new Error("Script injection result object is missing.");
    }
    // Check for errors reported *from* the injected script
     if (primaryResult.error) {
         throw new Error(`Error from injected script: ${primaryResult.error}`);
     }
     // Check if content is present (even if empty string is valid, null/undefined isn't)
     if (typeof primaryResult.content === 'undefined' || primaryResult.content === null) {
         throw new Error("Script injection did not return 'content' property.");
     }

    console.log(`Successfully got content from tab ${tabId}`);
    return primaryResult;

  } catch (error) {
    console.error(`Error injecting script or processing result for tab ${tabId}:`, error);
    // Provide more context about potential causes
     let detailedErrorMessage = error.message;
     if (error.message.includes("Cannot access contents of url") || error.message.includes("Cannot access a chrome:// URL") || error.message.includes("Extension manifest must request permission")) {
         detailedErrorMessage = `Permission error: Cannot inject script into ${tabId}. Check host_permissions in manifest.json or if the page is restricted (e.g., chrome:// pages, other extension pages). Original error: ${error.message}`;
     } else if (error.message.includes("No tab with id")) {
          detailedErrorMessage = `Tab ${tabId} was likely closed before script injection could complete. Original error: ${error.message}`;
     }
    throw new Error(`Failed to execute or get result from script in tab: ${detailedErrorMessage}`);
  }
}

// Closes a tab
async function closeTab(tabId) {
  try {
    await chrome.tabs.remove(tabId);
    console.log(`Closed tab ${tabId}`);
  } catch (error) {
    // This can happen if the tab was already closed manually or by another error
    console.warn(`Could not close tab ${tabId} (may already be closed):`, error.message);
  }
}

// Helper function to send messages to the popup
function sendMessageToPopup(message) {
  chrome.runtime.sendMessage(message).catch(error => {
       // Catch errors that occur if the popup is closed when message is sent
       if (error.message.includes("Receiving end does not exist")) {
            // This is expected if the popup is closed, usually safe to ignore
            // console.log("Attempted to send message to closed popup:", message.type);
       } else {
            // Log other unexpected messaging errors
            console.error("Error sending message to popup:", error.message, message);
       }
   });
}

// Helper to shorten URLs for display
function getShortUrl(url, maxLength = 50) {
  // (Same implementation as before)
  if (!url) return "Invalid URL";
  if (url.length <= maxLength) return url;
  try {
    const parsedUrl = new URL(url);
    let short = parsedUrl.hostname + parsedUrl.pathname;
    if (short.endsWith("/")) short = short.slice(0, -1); // Remove trailing slash
    if (short.length > maxLength) {
      short = short.substring(0, maxLength - 3) + "...";
    }
    return short;
  } catch {
    return url.length > maxLength ? url.substring(0, maxLength - 3) + "..." : url;
  }
}


console.log("Background service worker (v1.1a - Content Extractor Debug) started.");