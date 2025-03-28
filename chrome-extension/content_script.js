// content_script.js (v3 - Using chrome.scripting.executeScript)

const NEXT_APP_STATE_ACCESSOR = "__MY_CATEGORY_APP_STATE_ACCESSOR__";

console.log("Article Summarizer content script loaded (v3 - Minimal).");

// --- Helper function to execute code in the MAIN world ---
async function executeInMainWorld(func, args = []) {
  // Ensure the function exists in the global scope for executeScript
  // Or pass the function body as a string if it's complex / uses variables not in scope
  // For simple cases like accessing window properties, using func name is okay.

  try {
    const injectionResults = await chrome.scripting.executeScript({
      target: { tabId: await getCurrentTabId() }, // Requires getting the current tab ID
      world: "MAIN", // Execute in the main page world
      func: (accessorKey, funcName, funcArgs) => {
        // This function runs in the MAIN world context
        const detail = {};
        try {
          const accessor = window[accessorKey];
          if (accessor && typeof accessor[funcName] === "function") {
            const result = accessor[funcName].apply(accessor, funcArgs);
            detail.success = true;
            detail.data = result;
          } else {
            console.error(`[MAIN World] Accessor function ${funcName} not found on window[${accessorKey}].`);
            detail.success = false;
            detail.error = `Accessor function ${funcName} not found.`;
          }
        } catch (e) {
          console.error(`[MAIN World] Error executing ${funcName}:`, e);
          detail.success = false;
          detail.error = e.message || `Unknown error executing ${funcName}.`;
        }
        // IMPORTANT: Return the result so it's captured by injectionResults
        return detail;
      },
      args: [NEXT_APP_STATE_ACCESSOR, func, args], // Pass necessary data as arguments
    });

    // Check the structure of the results
    if (!injectionResults || injectionResults.length === 0 || !injectionResults[0].result) {
      throw new Error("Script injection returned no result or unexpected format.");
    }

    const resultDetail = injectionResults[0].result;

    if (resultDetail.success) {
      return resultDetail.data;
    } else {
      throw new Error(resultDetail.error || `executeScript function failed for ${func}.`);
    }
  } catch (error) {
    console.error(`[ContentScript] Error during chrome.scripting.executeScript for ${func}:`, error);
    // Rethrow a more specific error if possible
    if (error.message.includes("No tab with id")) {
      throw new Error(`Target tab closed before script execution could complete.`);
    } else if (error.message.includes("Cannot access") || error.message.includes("Extension manifest")) {
      throw new Error(`Permission error executing script on target tab. Check host_permissions.`);
    }
    throw new Error(`Failed to execute script in main world: ${error.message}`);
  }
}

// Helper to get current tab ID (needed for executeScript target)
// Note: Content scripts usually don't have direct access to their tab ID easily.
// It's better if the *caller* (popup/background) provides the tab ID.
// We will assume the message comes with sender.tab.id and pass it.
// This helper is more for standalone testing if needed.
async function getCurrentTabId() {
  // This is a placeholder - in practice, use sender.tab.id from the message
  console.warn("Attempting to guess current tab ID - use sender.tab.id if possible.");
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) throw new Error("Could not determine active tab ID.");
  return tab.id;
}

// --- Listener for messages from Popup or Background Script ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[ContentScript] Received message:", message.type, "from sender:", sender);

  // --- SCAN ---
  if (message.type === "SCAN_PAGE_FOR_FAILED_ARTICLES") {
    console.log("[ContentScript] Attempting to get state via MAIN world script...");
    // We don't need to check window here, executeInMainWorld will do it
    executeInMainWorld("getState") // Pass function name as string
      .then(categories => {
        console.log("[ContentScript] Received state via MAIN world script:", categories);
        if (!categories || !Array.isArray(categories)) {
          throw new Error("Invalid or non-array state received from page execution.");
        }

        // Filter articles (same logic as before)
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
                  `[ContentScript] Found failed article: ${article.title} (ID: ${article.id}) in category ${category.id}`
                );
                failedArticles.push({ link: article.link, categoryId: category.id, articleId: article.id });
              } else if (!article.id) {
                console.warn(`[ContentScript] Skipping article without ID in category ${category.id}:`, article.title);
              }
            });
          }
        });
        console.log("[ContentScript] Found failed articles to process:", failedArticles);

        // Send results (same logic as before)
        if (failedArticles.length === 0) {
          chrome.runtime.sendMessage({
            type: "FIX_PROCESS_UPDATE",
            text: "No failed articles found requiring fix.",
            level: "info",
            isComplete: true,
          });
          sendResponse({ status: "no_failed_articles" });
        } else {
          chrome.runtime.sendMessage({ type: "PROCESS_FAILED_ARTICLES", articles: failedArticles }, bgResponse => {
            if (chrome.runtime.lastError) {
              /* handle error */
              console.error("[ContentScript] Error sending failed articles to background:", chrome.runtime.lastError);
              chrome.runtime.sendMessage({
                type: "FIX_PROCESS_UPDATE",
                text: `Error: ${chrome.runtime.lastError.message}`,
                level: "error",
                isComplete: true,
              });
              sendResponse({ status: "error", error: chrome.runtime.lastError.message });
            } else if (bgResponse?.status === "received") {
              /* handle success */
              console.log("[ContentScript] Background script acknowledged receipt.");
              chrome.runtime.sendMessage({
                type: "FIX_PROCESS_UPDATE",
                text: `Processing ${failedArticles.length} failed article(s)...`,
                level: "info",
                isComplete: false,
              });
              sendResponse({ status: "processing_started" });
            } else {
              /* handle unexpected response */
              console.warn("[ContentScript] Unexpected response from background:", bgResponse);
              chrome.runtime.sendMessage({
                type: "FIX_PROCESS_UPDATE",
                text: "Error: Background script comms failed.",
                level: "error",
                isComplete: true,
              });
              sendResponse({ status: "error", error: "Background script communication failed" });
            }
          });
        }
      })
      .catch(error => {
        // Catch errors from executeInMainWorld (including accessor not found)
        console.error("[ContentScript] Error executing script in MAIN world or processing state:", error);
        let userMessage = `Error getting state: ${error.message}`;
        let responseStatus = "error";
        if (error.message?.includes("Accessor function") && error.message?.includes("not found")) {
          userMessage = "Error: App state accessor not found on the page.";
          responseStatus = "app_not_found";
        } else if (error.message?.includes("Permission error executing script")) {
          userMessage = "Error: Extension lacks permission for this page.";
        }
        chrome.runtime.sendMessage({ type: "FIX_PROCESS_UPDATE", text: userMessage, level: "error", isComplete: true });
        sendResponse({ status: responseStatus, error: error.message });
      });

    // Return true because the promise handles the async response
    return true;
  }

  // --- UPDATE ---
  else if (message.type === "UPDATE_ARTICLE_IN_PAGE") {
    console.log("[ContentScript] Attempting to update article via MAIN world script:", message.payload);
    executeInMainWorld("updateArticle", [message.payload]) // Pass function name and payload in args array
      .then(result => {
        console.log("[ContentScript] Page update MAIN world execution result:", result);
        // result here is the { success: true/false, ... } object returned by updateArticle in the hook
        sendResponse({ status: "update_attempted", success: result?.success });
        chrome.runtime.sendMessage({
          type: "FIX_PROCESS_UPDATE",
          text: result?.success
            ? `Updated article ID ${message.payload?.articleId} in page.`
            : `Failed to update article ID ${message.payload?.articleId} in page. Error: ${result?.error || ""}`,
          level: result?.success ? "info" : "error",
          isComplete: false,
        });
      })
      .catch(error => {
        console.error("[ContentScript] Error executing update script in MAIN world:", error);
        sendResponse({ status: "error", error: error.message });
        chrome.runtime.sendMessage({
          type: "FIX_PROCESS_UPDATE",
          text: `Error updating page via script: ${error.message}`,
          level: "error",
          isComplete: false,
        });
      });
    // Return true because the promise handles the async response
    return true;
  }

  // --- Unhandled ---
  console.warn(`[ContentScript] Unhandled message type: ${message.type}`);
  return false;
});

// --- Removed old helper functions (executeInPageContext, injectScriptAndGetState, injectScriptAndUpdateArticle) ---
// --- Added getCurrentTabId (though ideally not needed if sender provides ID) ---
