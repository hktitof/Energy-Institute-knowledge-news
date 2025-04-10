const urlListTextarea = document.getElementById("url-list");
const fetchButton = document.getElementById("fetch-button");
const clearButton = document.getElementById("clear-button");
const statusMessage = document.getElementById("status-message");
const resultsTableBody = document.getElementById("results-table").querySelector("tbody");
const clearResultsButton = document.getElementById("clear-results-button");
const progressBarContainer = document.getElementById("progress-bar-container");
const progressBar = document.getElementById("progress-bar");

const fixFailedButton = document.getElementById("fix-failed-button");
const fixStatus = document.getElementById("fix-status");

fixFailedButton.addEventListener("click", async () => {
  setLoadingState(true);
  fixStatus.textContent = "Requesting page scan from background..."; // Update status text
  fixStatus.style.color = "#7f8c8d";

  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs.length === 0 || !tabs[0].id) {
      fixStatus.textContent = "Error: Could not get active tab ID.";
      fixStatus.style.color = "#c0392b";
      setLoadingState(false);
      return;
    }
    const activeTabId = tabs[0].id;

    // Send message to the BACKGROUND script, including the target tab ID
    chrome.runtime.sendMessage(
      {
        type: "SCAN_PAGE_FOR_FAILED_ARTICLES", // Send to background
        targetTabId: activeTabId, // Include the tab ID
      },
      response => {
        // Response comes from the BACKGROUND script now
        if (chrome.runtime.lastError) {
          fixStatus.textContent = `Error communicating with background: ${chrome.runtime.lastError.message}.`;
          fixStatus.style.color = "#c0392b";
          console.error("Error sending SCAN message to background:", chrome.runtime.lastError);
          setLoadingState(false);
        } else if (response && response.status === "scan_initiated") {
          fixStatus.textContent = "Scan initiated by background...";
        } else if (response && response.status === "app_not_found") {
          fixStatus.textContent = "Error: App state accessor not found on page (reported by background).";
          fixStatus.style.color = "#c0392b";
          setLoadingState(false);
        } else if (response && response.status === "error") {
          fixStatus.textContent = `Error during scan: ${response.error}`;
          fixStatus.style.color = "#c0392b";
          setLoadingState(false);
        } else {
          fixStatus.textContent = "Error: Unexpected response from background script.";
          fixStatus.style.color = "#c0392b";
          setLoadingState(false);
        }
        // setLoadingState(false) will be handled by FIX_PROCESS_UPDATE when complete
      }
    );
  });
});

// --- Event Listeners ---

fetchButton.addEventListener("click", async () => {
  const urls = urlListTextarea.value
    .split("\n")
    .map(url => url.trim())
    .filter(url => url.length > 0 && (url.startsWith("http://") || url.startsWith("https://")));

  if (urls.length === 0) {
    updateStatus("Please paste valid URLs (starting with http:// or https://) into the text area.", "error");
    return;
  }

  // Clear previous results and status
  resultsTableBody.innerHTML = "";
  clearResultsButton.style.display = "none";
  updateStatus(`Sending ${urls.length} URL(s) for processing...`, "info");
  setLoadingState(true);
  resetProgress();

  // Send URLs to the background script
  chrome.runtime.sendMessage({ type: "FETCH_ARTICLES", urls: urls }, response => {
    if (chrome.runtime.lastError) {
      updateStatus(`Error sending message: ${chrome.runtime.lastError.message}`, "error");
      setLoadingState(false);
      return;
    }
    if (response && response.status === "received") {
      updateStatus("Processing started...", "info");
    } else {
      updateStatus("Background script did not respond correctly.", "error");
      setLoadingState(false);
    }
  });
});

clearButton.addEventListener("click", () => {
  urlListTextarea.value = "";
  updateStatus(""); // Clear status
});

clearResultsButton.addEventListener("click", () => {
  resultsTableBody.innerHTML = "";
  clearResultsButton.style.display = "none";
  updateStatus("Results cleared.");
});

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received in popup:", message); // For debugging
  switch (message.type) {
    case "UPDATE_STATUS":
      updateStatus(message.text, message.level);
      if (message.progress !== undefined) {
        updateProgress(message.progress);
      }
      break;
    case "ADD_RESULT":
      addResultToTable(message.data);
      clearResultsButton.style.display = "block";
      break;
    case "PROCESSING_COMPLETE":
      updateStatus(message.text || "Processing finished!", "success");
      setLoadingState(false);
      hideProgress();
      break;
    case "PROCESSING_ERROR":
      updateStatus(`Error: ${message.error}`, "error");
      setLoadingState(false);
      hideProgress();
      break;
    case "FIX_PROCESS_UPDATE":
      fixStatus.textContent = message.text;
      fixStatus.style.color =
        message.level === "error" ? "#c0392b" : message.level === "success" ? "#27ae60" : "#7f8c8d";
      if (message.isComplete) {
        setLoadingState(false); // Disable loading only when process is fully complete
      }
      break;
    default:
      console.warn("Unknown message type received:", message.type);
  }
  // Acknowledge receipt (important for async message handling)
  sendResponse({ status: "received from popup" });
  return true; // Indicate async response is possible (though not strictly needed here)
});

// Reset fix status on popup open
fixStatus.textContent = "";

// --- UI Update Functions ---

function setLoadingState(isLoading) {
  fetchButton.disabled = isLoading;
  urlListTextarea.disabled = isLoading;
  statusMessage.textContent = isLoading ? "Processing..." : statusMessage.textContent; // Keep existing message if not loading
}

function updateStatus(message, level = "info") {
  // level can be 'info', 'error', 'success'
  statusMessage.textContent = message;
  statusMessage.style.color = level === "error" ? "#c0392b" : level === "success" ? "#27ae60" : "#7f8c8d";
  console.log(`Status (${level}): ${message}`);
}

function updateProgress(percentage) {
  progressBarContainer.style.display = "block";
  progressBar.style.width = `${percentage}%`;
}

function resetProgress() {
  progressBarContainer.style.display = "none";
  progressBar.style.width = "0%";
}

function hideProgress() {
  setTimeout(() => {
    // Hide after a short delay so user sees 100%
    progressBarContainer.style.display = "none";
    progressBar.style.width = "0%";
  }, 1500);
}

function addResultToTable(data) {
  const row = resultsTableBody.insertRow();
  const titleCell = row.insertCell();
  const summaryCell = row.insertCell();

  titleCell.textContent = data.title || "N/A";
  summaryCell.textContent = data.summary || "N/A";

  // Add tooltips for potentially long content
  titleCell.title = data.title || "N/A";
  summaryCell.title = data.summary || "N/A";

  if (data.error) {
    row.style.backgroundColor = "#fbeaea"; // Light red for errors
    summaryCell.textContent = `Error: ${data.error}`;
    summaryCell.style.color = "#c0392b";
  }
}

// Initial status
updateStatus('Ready. Paste URLs and click "Fetch Articles".');
