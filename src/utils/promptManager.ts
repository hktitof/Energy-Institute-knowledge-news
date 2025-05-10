// services/promptService.ts
import type { PromptPurpose } from "../utils/utils"; // Adjust paths
import type { ApiFullPromptData } from "../hooks/usePrompts"; // Assuming these are exported

// Re-define or import getEndpoints and getStorageKey
const getEndpoints = (purpose: PromptPurpose) => {
  // ... (same as in usePrompts)
  switch (purpose) {
    case "article_summary":
      return { fetchUrl: "/api/prompts/singleArticle", updateUrl: "/api/prompts/updateSingleArticle" };
    case "summary_of_summary":
      return { fetchUrl: "/api/prompts/summaryOfSummary", updateUrl: "/api/prompts/updateSummaryOfSummary" };
    default:
      return { fetchUrl: "", updateUrl: "" };
  }
};
const getStorageKey = (purpose: PromptPurpose): string => `promptSettings_${purpose}`;

export async function fetchAndUpdateLocalStorage(purpose: PromptPurpose): Promise<boolean> {
  const { fetchUrl } = getEndpoints(purpose);
  if (!fetchUrl) {
    console.error(`[PromptService] No fetch URL for purpose: ${purpose}`);
    return false;
  }

  try {
    console.log(`[PromptService] Force fetching fresh data for ${purpose} from API: ${fetchUrl}`);
    const response = await fetch(fetchUrl);
    if (!response.ok) {
      // ... (error handling similar to usePrompts) ...
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API fetch failed for ${purpose} (${response.status})`);
    }
    const fetchedApiData = (await response.json()) as ApiFullPromptData; // Ensure this type matches API

    // Update localStorage
    const storageKey = getStorageKey(purpose);
    localStorage.setItem(storageKey, JSON.stringify(fetchedApiData));
    console.log(`[PromptService] Updated localStorage for ${purpose} with fresh API data.`);
    return true;
  } catch (error) {
    console.error(`[PromptService] Error fetching/updating localStorage for ${purpose}:`, error);
    return false;
  }
}

export async function refreshAllPromptSettingsInLocalStorage(): Promise<void> {
  console.log("[PromptService] Refreshing all prompt settings in localStorage...");
  // Define all your purposes explicitly or get them from a central place
  const purposes: PromptPurpose[] = ["article_summary", "summary_of_summary"];
  for (const purpose of purposes) {
    await fetchAndUpdateLocalStorage(purpose);
  }
  console.log("[PromptService] Finished refreshing all prompt settings.");
}
