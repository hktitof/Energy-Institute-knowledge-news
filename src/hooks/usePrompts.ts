import { useState, useEffect, useCallback } from "react";
import type { PromptPurpose, PromptData } from "../utils/utils"; // Adjust path if needed

// Helper function to get API endpoints based on purpose
const getEndpoints = (purpose: PromptPurpose) => {
  switch (purpose) {
    case "article_summary":
      return {
        fetchUrl: "/api/prompts/singleArticle", // Your GET endpoint
        updateUrl: "/api/prompts/updateSingleArticle", // Your PUT endpoint
      };
    case "summary_of_summary":
      // Define these endpoints when you create them
      return {
        fetchUrl: "/api/prompts/summaryOfSummary", // Placeholder
        updateUrl: "/api/prompts/updateSummaryOfSummary", // Placeholder
      };
    default:
      // Handle unexpected purpose or return default/error
      console.error("Invalid prompt purpose:", purpose);
      return { fetchUrl: "", updateUrl: "" };
  }
};

interface UsePromptsResult {
  systemPrompt: string | null;
  userPrompt: string | null;
  setSystemPrompt: React.Dispatch<React.SetStateAction<string | null>>; // Allow local edits
  setUserPrompt: React.Dispatch<React.SetStateAction<string | null>>; // Allow local edits
  isLoadingFetch: boolean;
  isUpdating: boolean;
  fetchError: string | null;
  updateError: string | null;
  isUpdateSuccess: boolean;
  // Modify savePrompts signature to accept optional overrides
  savePrompts: (promptsToSave?: { systemPrompt: string; userPrompt: string }) => Promise<void>;
  resetUpdateStatus: () => void; // Function to manually reset success/error status
}

export const usePrompts = (purpose: PromptPurpose): UsePromptsResult => {
  const [systemPrompt, setSystemPrompt] = useState<string | null>(null);
  const [userPrompt, setUserPrompt] = useState<string | null>(null);
  const [isLoadingFetch, setIsLoadingFetch] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [isUpdateSuccess, setIsUpdateSuccess] = useState<boolean>(false);

  const { fetchUrl, updateUrl } = getEndpoints(purpose);

  // --- Fetching Logic ---
  useEffect(() => {
    if (!fetchUrl) {
      setFetchError(`No fetch endpoint configured for purpose: ${purpose}`);
      setIsLoadingFetch(false);
      return;
    }

    const fetchData = async () => {
      setIsLoadingFetch(true);
      setFetchError(null);
      try {
        const response = await fetch(fetchUrl);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Failed to fetch prompts (${response.status})`);
        }
        const data: PromptData = await response.json();
        setSystemPrompt(data.systemPrompt);
        setUserPrompt(data.userPrompt);
      } catch (error) {
        console.error(`Error fetching prompts for ${purpose}:`, error);
        setFetchError(error instanceof Error ? error.message : "An unknown fetch error occurred");
        setSystemPrompt(null); // Clear potentially stale data on error
        setUserPrompt(null);
      } finally {
        setIsLoadingFetch(false);
      }
    };

    fetchData();
  }, [fetchUrl, purpose]); // Re-fetch if purpose changes (though unlikely in your current setup)

  // --- Updating Logic ---
  // ### Modified from here !!! ###
  const savePrompts = useCallback(
    async (
      promptsToSave?: { systemPrompt: string; userPrompt: string } // Accept optional argument
    ) => {
      if (!updateUrl) {
        setUpdateError(`No update endpoint configured for purpose: ${purpose}`);
        return;
      }

      // Determine which prompts to send
      const systemToSend = promptsToSave?.systemPrompt ?? systemPrompt;
      const userToSend = promptsToSave?.userPrompt ?? userPrompt;

      if (systemToSend === null || userToSend === null) {
        setUpdateError("Cannot save null prompts.");
        setIsUpdating(false); // Ensure updating state is reset
        return;
      }

      setIsUpdating(true);
      setUpdateError(null);
      setIsUpdateSuccess(false);

      try {
        const response = await fetch(updateUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          // Send the determined values
          body: JSON.stringify({ systemPrompt: systemToSend, userPrompt: userToSend }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Failed to update prompts (${response.status})`);
        }

        // If save was successful, update the hook's state to match what was saved
        // This is important if promptsToSave was provided (like during reset)
        // This ensures the hook's state reflects the persisted reality.
        setSystemPrompt(systemToSend);
        setUserPrompt(userToSend);
        setIsUpdateSuccess(true);
      } catch (error) {
        console.error(`Error updating prompts for ${purpose}:`, error);
        setUpdateError(error instanceof Error ? error.message : "An unknown update error occurred");
        setIsUpdateSuccess(false);
      } finally {
        setIsUpdating(false);
      }
      // Remove systemPrompt and userPrompt from dependencies here.
      // The function now relies on passed args or the state at execution time,
      // but doesn't need to be recreated *because* the state values change.
    },
    [updateUrl, purpose, systemPrompt, userPrompt]
  );
  // ### End of change here ###

  // --- Function to reset status ---
  const resetUpdateStatus = useCallback(() => {
    setUpdateError(null);
    setIsUpdateSuccess(false);
  }, []);

  return {
    systemPrompt,
    userPrompt,
    setSystemPrompt, // Expose setters for direct textarea binding
    setUserPrompt,
    isLoadingFetch,
    isUpdating,
    fetchError,
    updateError,
    isUpdateSuccess,
    savePrompts,
    resetUpdateStatus,
  };
};
