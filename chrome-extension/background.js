// background.js

// --- VERY IMPORTANT: Correct this based on your ACTUAL Next.js server ---
// --- Common setup: http, port 3000, path matching api filename ---
const API_ENDPOINT = "http://localhost:3000/api/extension-summarize-content"; // <-- VERIFY & CHANGE THIS
const NEXT_APP_STATE_ACCESSOR = "__MY_CATEGORY_APP_STATE_ACCESSOR__"; // Needs to be known here too

let currentProcessingQueue = [];
let isProcessing = false;
let originatingTabId = null; // Still needed for sending updates back

// --- Listener for messages from Popup ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(`[Background] Received message: Type=${message.type}`, "Payload:", message, "Sender:", sender);

  // --- Handle FETCH_ARTICLES (from Popup) ---
  if (message.type === "FETCH_ARTICLES" && sender.tab === undefined) {
    // ... (Keep existing logic as is) ...
    console.log("[Background] Handling FETCH_ARTICLES from Popup");
    currentProcessingQueue = message.urls.map(url => ({ link: url, isFixAttempt: false }));
    originatingTabId = null;
    if (!isProcessing) {
      processQueue();
    } else {
      console.log("[Background] Processing already active, URLs added to queue.");
    }
    sendResponse({ status: "received" });
    return true;
  }

  // --- Handle SCAN_PAGE_FOR_FAILED_ARTICLES (from Popup) ---
  else if (message.type === "SCAN_PAGE_FOR_FAILED_ARTICLES" && message.targetTabId) {
    console.log(`[Background] Handling SCAN_PAGE_FOR_FAILED_ARTICLES for tab ${message.targetTabId}`);
    // Store originating tab ID for potential later updates
    originatingTabId = message.targetTabId;

    // Execute script in the target tab's MAIN world to get state
    executeInMainWorld(message.targetTabId, "getState", []) // Pass tabId, func name, args
      .then(categories => {
        console.log("[Background] Received state via MAIN world script:", categories);
        if (!categories || !Array.isArray(categories)) {
          throw new Error("Invalid or non-array state received from page execution.");
        }

        // Filter articles (same logic, now in background)
        const failedArticles = [];
        categories.forEach(category => {
          if (category.articles && Array.isArray(category.articles)) {
            category.articles.forEach(article => {
              if (
                article.link &&
                article.id &&
                (article.title?.includes("Access Denied") ||
                  article.title?.includes("Error") ||
                  article.summary?.includes("Failed to fetch"))
              ) {
                console.log(
                  `[Background] Found failed article: ${article.title} (ID: ${article.id}) in category ${category.id}`
                );
                // Include targetTabId in the job if needed for update message later? No, use originatingTabId
                failedArticles.push({
                  link: article.link,
                  categoryId: category.id,
                  articleId: article.id,
                  isFixAttempt: true,
                }); // Mark as fix attempt
              } else if (!article.id) {
                console.warn(`[Background] Skipping article without ID in category ${category.id}:`, article.title);
              }
            });
          }
        });
        console.log("[Background] Found failed articles to process:", failedArticles);

        if (failedArticles.length === 0) {
          sendMessageToPopup({
            type: "FIX_PROCESS_UPDATE",
            text: "No failed articles found requiring fix.",
            level: "info",
            isComplete: true,
          });
          sendResponse({ status: "no_failed_articles" }); // Respond to popup
        } else {
          // Add jobs to queue and start processing
          currentProcessingQueue.push(...failedArticles);
          sendMessageToPopup({
            type: "FIX_PROCESS_UPDATE",
            text: `Found ${failedArticles.length}. Starting fix process...`,
            level: "info",
            isComplete: false,
          });
          if (!isProcessing) {
            processQueue();
          } else {
            console.log("[Background] Processing already active, fix jobs added to queue.");
          }
          sendResponse({ status: "processing_started" }); // Respond to popup
        }
      })
      .catch(error => {
        console.error("[Background] Error executing getState script or processing result:", error);
        let userMessage = `Error getting state: ${error.message}`;
        let responseStatus = "error";
        if (error.message?.includes("Accessor function") && error.message?.includes("not found")) {
          userMessage = "Error: App state accessor not found on the page.";
          responseStatus = "app_not_found";
        } else if (error.message?.includes("Permission error") || error.message.includes("Cannot access")) {
          userMessage = "Error: Extension lacks permission for this page.";
        } else if (error.message.includes("No tab with id") || error.message.includes("Target tab closed")) {
          userMessage = "Error: Target page tab was closed or invalid.";
        }
        sendMessageToPopup({ type: "FIX_PROCESS_UPDATE", text: userMessage, level: "error", isComplete: true });
        sendResponse({ status: responseStatus, error: error.message }); // Respond to popup
      });

    // Return true because the promise handles the asynchronous response
    return true;
  }

  // --- Handle UPDATE_ARTICLE_IN_PAGE (Internal call, or potentially from content script if needed later) ---
  // This message type is now primarily initiated *from* the background script (processQueue)
  // *to* the content script. Let's remove the listener for it here,
  // as the background script will *call* executeInMainWorld directly when needed.
  // else if (message.type === "UPDATE_ARTICLE_IN_PAGE") { ... }

  // --- Unhandled ---
  else {
    console.warn(`[Background] Received unhandled message type: ${message.type} or invalid sender context.`);
    return false;
  }
});

// --- NEW Helper function to execute code in MAIN world (using scripting API) ---
async function executeInMainWorld(tabId, funcName, args = []) {
  try {
    const injectionResults = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      world: "MAIN",
      func: (accessorKey, fnName, fnArgs) => {
        // Renamed params for clarity
        const detail = {};
        try {
          const accessor = window[accessorKey];
          if (accessor && typeof accessor[fnName] === "function") {
            detail.data = accessor[fnName].apply(accessor, fnArgs);
            detail.success = true;
          } else {
            detail.success = false;
            detail.error = `Accessor function ${fnName} not found.`;
          }
        } catch (e) {
          detail.success = false;
          detail.error = e.message || `Unknown error executing ${fnName}.`;
        }
        return detail; // Return the result object
      },
      args: [NEXT_APP_STATE_ACCESSOR, funcName, args],
    });

    if (!injectionResults || injectionResults.length === 0 || !injectionResults[0].result) {
      throw new Error(`Script injection for ${funcName} returned no result or bad format.`);
    }
    const resultDetail = injectionResults[0].result;
    if (resultDetail.success) {
      return resultDetail.data; // Resolve with the data from the page function
    } else {
      throw new Error(resultDetail.error || `Injected script failed for ${funcName}.`);
    }
  } catch (error) {
    console.error(`[Background] Error in executeInMainWorld for tab ${tabId}, func ${funcName}:`, error);
    // Add specific checks for common executeScript errors
    if (error.message.toLowerCase().includes("no tab with id")) {
      throw new Error(`Target tab ${tabId} closed or does not exist.`);
    } else if (
      error.message.toLowerCase().includes("cannot access contents of url") ||
      error.message.toLowerCase().includes("cannot access a chrome:// url") ||
      error.message.toLowerCase().includes("extension manifest must request permission")
    ) {
      throw new Error(`Permission error executing script on tab ${tabId}. Check host_permissions.`);
    } else if (error.message.toLowerCase().includes("frame with id 0 was not found")) {
      throw new Error(`Target frame in tab ${tabId} not found (page might be reloading or crashed?).`);
    }
    // Rethrow the original or a more generic error
    throw new Error(`executeInMainWorld failed: ${error.message}`);
  }
}

async function processQueue() {
  if (isProcessing || currentProcessingQueue.length === 0) {
    // ... (existing completion logic - check if lastJobWasFix using originatingTabId) ...
    isProcessing = false;
    if (currentProcessingQueue.length === 0 && !isProcessing) {
      const lastJobWasFix = originatingTabId !== null;
      sendMessageToPopup({
        type: lastJobWasFix ? "FIX_PROCESS_UPDATE" : "PROCESSING_COMPLETE",
        text: `Finished processing all jobs.`,
        level: "success",
        isComplete: true,
      });
      console.log("Background processing queue was already empty or finished.");
      if (lastJobWasFix) originatingTabId = null;
    }
    return;
  }

  isProcessing = true;
  const currentJob = currentProcessingQueue.shift();
  const url = currentJob.link;
  const isFixAttempt = currentJob.isFixAttempt;
  // IMPORTANT: Use originatingTabId stored when SCAN was received for updates
  const targetTabIdForStateUpdate = originatingTabId;

  const totalJobsInBatch = currentProcessingQueue.length + 1;
  const processedCountInBatch = totalJobsInBatch - currentProcessingQueue.length;
  const progress = Math.round(((processedCountInBatch - 1) / totalJobsInBatch) * 100);

  // Send status update to popup
  sendMessageToPopup({
    type: isFixAttempt ? "FIX_PROCESS_UPDATE" : "UPDATE_STATUS",
    text: `Processing ${isFixAttempt ? "fix " : ""}Job ${processedCountInBatch}/${totalJobsInBatch}: ${getShortUrl(
      url
    )}...`,
    level: "info",
    progress: progress,
    isComplete: false,
  });

  let tempTabId = null; // Tab ID for fetching content
  try {
    // Steps 1, 2, 3: Open Tab, Get Content, Close Tab (for the article URL)
    console.log(`[ProcessQueue] Opening tab for ${url}`);
    sendMessageToPopup({
      type: isFixAttempt ? "FIX_PROCESS_UPDATE" : "UPDATE_STATUS",
      text: `Opening tab for ${getShortUrl(url)}...`,
      level: "info",
      isComplete: false,
    });
    tempTabId = await openTabAndWait(url);
    if (!tempTabId) throw new Error("Failed to create or load article tab.");

    console.log(`[ProcessQueue] Extracting content from article tab ${tempTabId}`);
    sendMessageToPopup({
      type: isFixAttempt ? "FIX_PROCESS_UPDATE" : "UPDATE_STATUS",
      text: `Extracting content from ${getShortUrl(url)}...`,
      level: "info",
      isComplete: false,
    });
    const contentResult = await getContentFromTab(tempTabId); // Uses scripting in content script context - OK
    if (!contentResult || !contentResult.content) throw new Error("Failed to extract content from article tab.");

    console.log(`[ProcessQueue] Closing article tab ${tempTabId}`);
    sendMessageToPopup({
      type: isFixAttempt ? "FIX_PROCESS_UPDATE" : "UPDATE_STATUS",
      text: `Closing tab for ${getShortUrl(url)}...`,
      level: "info",
      isComplete: false,
    });
    await closeTab(tempTabId);
    tempTabId = null;

    // Step 4: Call API
    console.log(`[ProcessQueue] Calling API for ${url}`);
    sendMessageToPopup({
      type: isFixAttempt ? "FIX_PROCESS_UPDATE" : "UPDATE_STATUS",
      text: `Sending content to API for ${getShortUrl(url)}...`,
      level: "info",
      progress: Math.round(((processedCountInBatch - 0.5) / totalJobsInBatch) * 100),
      isComplete: false,
    });
    const apiResponse = await callSummarizeApi(contentResult.content, url);
    console.log(`[ProcessQueue] API response received for ${url}`);

    // Step 5: Handle Result - Update State in MAIN world if fix attempt
    if (isFixAttempt && targetTabIdForStateUpdate) {
      // Check if it's a fix and we have the target tab ID
      const updatePayload = {
        categoryId: currentJob.categoryId,
        articleId: currentJob.articleId,
        newDetails: {
          title: apiResponse.title || contentResult.title || "Fixed - Title N/A",
          summary: apiResponse.summary || "Fixed - Summary N/A",
        },
      };
      console.log(
        `[Background] Attempting to update article state in MAIN world of tab ${targetTabIdForStateUpdate}:`,
        updatePayload
      );
      try {
        // Use the background helper to execute in the MAIN world of the original tab
        const updateResult = await executeInMainWorld(targetTabIdForStateUpdate, "updateArticle", [updatePayload]);
        console.log("[Background] Page state update execution result:", updateResult); // Should be { success: true } or { success: false, error: ...}
        sendMessageToPopup({
          type: "FIX_PROCESS_UPDATE",
          text: updateResult?.success
            ? `Updated article ${currentJob.articleId} in page.`
            : `Failed to update ${currentJob.articleId} in page. Error: ${updateResult?.error || "unknown"}`,
          level: updateResult?.success ? "success" : "error",
          progress: Math.round((processedCountInBatch / totalJobsInBatch) * 100),
          isComplete: currentProcessingQueue.length === 0,
        });
      } catch (execError) {
        console.error("[Background] Error executing updateArticle in MAIN world:", execError);
        // Report failure to update state back to popup
        sendMessageToPopup({
          type: "FIX_PROCESS_UPDATE",
          text: `Error updating page state for ${getShortUrl(url)}: ${execError.message}`,
          level: "error",
          progress: Math.round((processedCountInBatch / totalJobsInBatch) * 100),
          isComplete: currentProcessingQueue.length === 0,
        });
      }
    } else if (!isFixAttempt) {
      // Original behavior: Add result directly to the popup table
      sendMessageToPopup({
        type: "ADD_RESULT",
        data: { title: apiResponse.title || contentResult.title || "N/A", summary: apiResponse.summary, url: url },
      });
      sendMessageToPopup({
        type: "UPDATE_STATUS",
        text: `Successfully summarized: ${getShortUrl(url)}`,
        level: "success",
        progress: Math.round((processedCountInBatch / totalJobsInBatch) * 100),
      });
    } else {
      // Fix attempt but targetTabId was missing - log warning
      console.warn(`[ProcessQueue] Fix attempt for ${url} but originatingTabId was not set.`);
      sendMessageToPopup({
        type: "FIX_PROCESS_UPDATE",
        text: `Processed fix for ${getShortUrl(url)}, but couldn't update page state (missing target tab).`,
        level: "warning",
        progress: Math.round((processedCountInBatch / totalJobsInBatch) * 100),
        isComplete: currentProcessingQueue.length === 0,
      });
    }
  } catch (error) {
    // Catch errors from the whole process (tab opening, API call, etc.)
    console.error(`>>> Error processing job for URL ${url}:`, error);
    const errorData = {
      title: `Error for ${getShortUrl(url)}`,
      summary: `Processing failed: ${error.message || "Unknown error occurred"}`,
      url: url,
      error: true,
    };
    if (isFixAttempt) {
      sendMessageToPopup({
        type: "FIX_PROCESS_UPDATE",
        text: `Failed to fix article: ${getShortUrl(url)} (${error.message})`,
        level: "error",
        progress: Math.round((processedCountInBatch / totalJobsInBatch) * 100),
        isComplete: currentProcessingQueue.length === 0,
      });
    } else {
      sendMessageToPopup({ type: "ADD_RESULT", data: errorData });
      sendMessageToPopup({
        type: "UPDATE_STATUS",
        text: `Failed to process: ${getShortUrl(url)}`,
        level: "error",
        progress: Math.round((processedCountInBatch / totalJobsInBatch) * 100),
      });
    }
    if (tempTabId) {
      console.warn(`Closing tab ${tempTabId} due to error in processing.`);
      await closeTab(tempTabId);
    }
  } finally {
    await new Promise(resolve => setTimeout(resolve, 750));
    isProcessing = false;
    processQueue();
  }
}

// --- Helper Functions --- (openTabAndWait, getContentFromTab, closeTab, callSummarizeApi, sendMessageToPopup, getShortUrl - KEEP AS THEY WERE, but ensure callSummarizeApi uses the CORRECTED API_ENDPOINT)

// --- Ensure callSummarizeApi uses the corrected endpoint ---
async function callSummarizeApi(htmlContent, url) {
  /* ... as before ... */
  try {
    const response = await fetch(API_ENDPOINT, {
      // Uses API_ENDPOINT from top
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ htmlContent: htmlContent, url: url, maxWords: 150 }),
    });
    if (!response.ok) {
      let errorMsg = `API request failed with status ${response.status}`;
      let errorData = null;
      try {
        errorData = await response.json();
        errorMsg = errorData.error || errorMsg;
      } catch {
        try {
          const textError = await response.text();
          errorMsg += ` - ${textError.substring(0, 100)}`;
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
    let specificErrorMsg = error.message;
    if (error.name === "TypeError" && error.message.includes("fetch")) {
      specificErrorMsg = `Network error or incorrect API endpoint (${API_ENDPOINT}). Check API server status and URL.`;
    } else if (error.name === "AbortError") {
      specificErrorMsg = "API call timed out.";
    }
    throw new Error(`API communication error: ${specificErrorMsg}`);
  }
}

// Opens a tab and waits for it to be 'complete'
function openTabAndWait(url, timeout = 20000) {
  /* ... as before ... */
  return new Promise(async (resolve, reject) => {
    let tabId = null;
    let timedOut = false;
    let listenerAttached = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      console.error(`Tab loading timed out for ${url}`);
      if (listenerAttached) {
        try {
          chrome.tabs.onUpdated.removeListener(listener);
        } catch {}
        listenerAttached = false;
      }
      reject(new Error(`Tab loading timed out after ${timeout / 1000} seconds for ${url}`));
      if (tabId) {
        console.log(`Attempting to close timed-out tab ${tabId}`);
        closeTab(tabId).catch(e => console.warn(`Failed to close timed-out tab ${tabId}: ${e.message}`));
      }
    }, timeout);
    const listener = (updatedTabId, changeInfo) => {
      if (updatedTabId === tabId) {
        if (changeInfo.status === "complete") {
          if (!timedOut) {
            clearTimeout(timeoutId);
            if (listenerAttached) {
              try {
                chrome.tabs.onUpdated.removeListener(listener);
              } catch {}
              listenerAttached = false;
            }
            console.log(`Tab ${tabId} reported status 'complete' for ${url}`);
            setTimeout(() => resolve(tabId), 250);
          }
        } else if (changeInfo.status === "error" || (changeInfo.error && updatedTabId === tabId)) {
          if (!timedOut) {
            clearTimeout(timeoutId);
            if (listenerAttached) {
              try {
                chrome.tabs.onUpdated.removeListener(listener);
              } catch {}
              listenerAttached = false;
            }
            console.error(`Tab ${tabId} encountered an error during loading: ${changeInfo.error || "unknown error"}`);
            reject(new Error(`Tab failed to load: ${changeInfo.error || "unknown error"}`));
            closeTab(tabId).catch(e => console.warn(`Failed to close errored tab ${tabId}: ${e.message}`));
          }
        }
      }
    };
    try {
      chrome.tabs.onUpdated.addListener(listener);
      listenerAttached = true;
      const tab = await chrome.tabs.create({ url: url, active: false });
      tabId = tab.id;
      if (!tabId) {
        throw new Error("chrome.tabs.create did not return a valid tab ID.");
      }
    } catch (error) {
      console.error(`Error during tab creation or listener setup for ${url}:`, error);
      clearTimeout(timeoutId);
      if (listenerAttached) {
        try {
          chrome.tabs.onUpdated.removeListener(listener);
        } catch {}
      }
      reject(new Error(`Error creating tab for ${url}: ${error.message}`));
    }
  });
}

// Injects script to get content
async function getContentFromTab(tabId) {
  /* ... as before ... */
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      // Note: This function runs in the Content Script's context, NOT MAIN world
      // It's okay here as it only accesses basic document properties.
      func: () => {
        try {
          if (!document || !document.documentElement) {
            return { error: "Document or documentElement not available." };
          }
          return {
            content: document.documentElement.outerHTML || "",
            title: document.title || "",
            url: window.location.href,
          };
        } catch (e) {
          return { error: `Error inside injected script: ${e.message}` };
        }
      },
    });
    if (!results || results.length === 0) {
      throw new Error("Script injection returned no results.");
    }
    const primaryResult = results[0].result;
    if (!primaryResult) {
      throw new Error("Script injection result object is missing.");
    }
    if (primaryResult.error) {
      throw new Error(`Error from injected script: ${primaryResult.error}`);
    }
    if (typeof primaryResult.content === "undefined" || primaryResult.content === null) {
      throw new Error("Script injection did not return 'content' property.");
    }
    return primaryResult;
  } catch (error) {
    console.error(`Error injecting script or processing result for tab ${tabId}:`, error);
    let detailedErrorMessage = error.message;
    if (
      error.message.includes("Cannot access contents of url") ||
      error.message.includes("Cannot access a chrome:// URL") ||
      error.message.includes("Extension manifest must request permission")
    ) {
      detailedErrorMessage = `Permission error: Cannot inject script into ${tabId}. Check host_permissions or restricted page. Original: ${error.message}`;
    } else if (error.message.includes("No tab with id")) {
      detailedErrorMessage = `Tab ${tabId} likely closed before script injection. Original: ${error.message}`;
    }
    throw new Error(`Failed to execute or get result from script in tab: ${detailedErrorMessage}`);
  }
}

// Closes a tab
async function closeTab(tabId) { /* ... as before ... */
 try { await chrome.tabs.remove(tabId); }
 catch (error) { console.warn(`Could not close tab ${tabId} (may already be closed):`, error.message); }
}
function sendMessageToPopup(message) { /* ... as before ... */
 chrome.runtime.sendMessage(message).catch(error => {
      if (error.message.includes("Receiving end does not exist")) { /* Expected if popup closed */ }
      else { console.error("Error sending message to popup:", error.message, message); }
  });
}

// Helper to shorten URLs for display
function getShortUrl(url, maxLength = 50) { /* ... as before ... */
    if (!url) return "Invalid URL"; if (url.length <= maxLength) return url;
    try {
      const parsedUrl = new URL(url); let short = parsedUrl.hostname + parsedUrl.pathname;
      if (short.endsWith("/")) short = short.slice(0, -1);
      if (short.length > maxLength) { short = short.substring(0, maxLength - 3) + "..."; }
      return short;
    } catch { return url.length > maxLength ? url.substring(0, maxLength - 3) + "..." : url; }
  }

console.log("Background service worker (v1.1a - Content Extractor Debug) started.");
