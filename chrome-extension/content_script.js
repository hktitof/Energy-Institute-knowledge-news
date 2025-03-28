// content_script.js

// Listen for a message from the background script asking for content
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_CONTENT") {
    console.log("Content script received GET_CONTENT for:", window.location.href);
    const htmlContent = document.documentElement.outerHTML;
    const pageTitle = document.title;
    // Send the content back to the background script
    sendResponse({
      type: "CONTENT_RESULT",
      content: htmlContent,
      title: pageTitle, // Send title too, easier than API re-parsing
      url: window.location.href,
    });
    // Indicate that the response is sent asynchronously (important!)
    return true;
  }
  // Handle other potential message types if needed
  return false; // Indicate synchronous response or no response
});

console.log("Article Summarizer content script loaded."); // For debugging
