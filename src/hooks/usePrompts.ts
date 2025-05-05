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
  savePrompts: () => Promise<void>; // Function to trigger the update
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
  const savePrompts = useCallback(async () => {
    if (!updateUrl) {
      setUpdateError(`No update endpoint configured for purpose: ${purpose}`);
      return;
    }
    if (systemPrompt === null || userPrompt === null) {
      setUpdateError("Cannot save null prompts.");
      return;
    }

    setIsUpdating(true);
    setUpdateError(null);
    setIsUpdateSuccess(false); // Reset success flag on new attempt

    try {
      const response = await fetch(updateUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ systemPrompt, userPrompt }), // Send current state
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to update prompts (${response.status})`);
      }

      // Successfully updated
      setIsUpdateSuccess(true);
      // Optional: Automatically reset success message after a delay
      // setTimeout(() => setIsUpdateSuccess(false), 3000); // Reset after 3 seconds
    } catch (error) {
      console.error(`Error updating prompts for ${purpose}:`, error);
      setUpdateError(error instanceof Error ? error.message : "An unknown update error occurred");
      setIsUpdateSuccess(false);
    } finally {
      setIsUpdating(false);
    }
  }, [updateUrl, purpose, systemPrompt, userPrompt]); // Dependencies for the update function

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
