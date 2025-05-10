// hooks/usePrompts.ts
import { useState, useEffect, useCallback, useRef } from "react"; // Added useRef
import type { PromptPurpose } from "../utils/utils"; // Adjust path as needed
import {
  default_single_article_systemPrompt,
  default_single_article_userPromptInstructions,
  default_summary_of_summary_systemPrompt,
  default_summary_of_summary_userPromptInstructions,
} from "../utils/utils"; // Adjust path
export interface ApiFullPromptData {
  systemPrompt: string;
  userPrompt: string;
  maxWords: number;
  defaultSystemPrompt: string;
  defaultUserPrompt: string;
  defaultMaxWords: number;
}

interface StoredPromptSettings {
  systemPrompt: string;
  userPrompt: string;
  maxWords: number;
  defaultSystemPrompt: string;
  defaultUserPrompt: string;
  defaultMaxWords: number;
}

const getStorageKey = (purpose: PromptPurpose): string => `promptSettings_${purpose}`;

const getEndpoints = (purpose: PromptPurpose) => {
  switch (purpose) {
    case "article_summary":
      return { fetchUrl: "/api/prompts/singleArticle", updateUrl: "/api/prompts/updateSingleArticle" };
    case "summary_of_summary":
      return { fetchUrl: "/api/prompts/summaryOfSummary", updateUrl: "/api/prompts/updateSummaryOfSummary" };
    default:
      console.error("Invalid prompt purpose in getEndpoints:", purpose);
      return { fetchUrl: "", updateUrl: "" };
  }
};

export interface UsePromptsResult {
  systemPrompt: string | null;
  userPrompt: string | null;
  maxWords: number | null;
  defaultSystemPromptFromApi: string | null;
  defaultUserPromptFromApi: string | null;
  defaultMaxWordsFromApi: number | null;
  setSystemPrompt: React.Dispatch<React.SetStateAction<string | null>>;
  setUserPrompt: React.Dispatch<React.SetStateAction<string | null>>;
  setMaxWords: React.Dispatch<React.SetStateAction<number | null>>;
  isLoadingFetch: boolean;
  isUpdating: boolean;
  fetchError: string | null;
  updateError: string | null;
  isUpdateSuccess: boolean;
  savePrompts: (promptsToSave?: { systemPrompt: string; userPrompt: string; maxWords: number }) => Promise<void>;
  resetUpdateStatus: () => void;
  forceRefetch: () => void;
}

export const areSettingsDifferent = (s1: Partial<StoredPromptSettings>, s2: Partial<StoredPromptSettings>): boolean => {
  return (
    s1.systemPrompt !== s2.systemPrompt ||
    s1.userPrompt !== s2.userPrompt ||
    s1.maxWords !== s2.maxWords ||
    s1.defaultSystemPrompt !== s2.defaultSystemPrompt ||
    s1.defaultUserPrompt !== s2.defaultUserPrompt ||
    s1.defaultMaxWords !== s2.defaultMaxWords
  );
};

// Define application-level defaults (consider importing from utils.ts)
const APP_DEFAULT_SETTINGS: StoredPromptSettings = {
  systemPrompt: "Default System Prompt from App",
  userPrompt: "Default User Prompt from App",
  maxWords: 150,
  defaultSystemPrompt: "Default System Prompt from App",
  defaultUserPrompt: "Default User Prompt from App",
  defaultMaxWords: 150,
};

export const usePrompts = (purpose: PromptPurpose): UsePromptsResult => {
  const [systemPrompt, setSystemPrompt] = useState<string | null>(null);
  const [userPrompt, setUserPrompt] = useState<string | null>(null);
  const [maxWords, setMaxWords] = useState<number | null>(null);
  const [defaultSystemPromptFromApi, setDefaultSystemPromptFromApi] = useState<string | null>(null);
  const [defaultUserPromptFromApi, setDefaultUserPromptFromApi] = useState<string | null>(null);
  const [defaultMaxWordsFromApi, setDefaultMaxWordsFromApi] = useState<number | null>(null);

  const [isLoadingFetch, setIsLoadingFetch] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [isUpdateSuccess, setIsUpdateSuccess] = useState<boolean>(false);
  const [triggerRefetch, setTriggerRefetch] = useState(0);

  const { fetchUrl, updateUrl } = getEndpoints(purpose);
  const storageKey = getStorageKey(purpose);

  // Use a ref to store the latest state for use in callbacks without adding them to dependency arrays
  // This helps prevent re-creation of callbacks that would trigger useEffect.
  const stateRef = useRef({
    systemPrompt,
    userPrompt,
    maxWords,
    defaultSystemPromptFromApi,
    defaultUserPromptFromApi,
    defaultMaxWordsFromApi,
  });

  useEffect(() => {
    stateRef.current = {
      systemPrompt,
      userPrompt,
      maxWords,
      defaultSystemPromptFromApi,
      defaultUserPromptFromApi,
      defaultMaxWordsFromApi,
    };
  }, [
    systemPrompt,
    userPrompt,
    maxWords,
    defaultSystemPromptFromApi,
    defaultUserPromptFromApi,
    defaultMaxWordsFromApi,
  ]);

  // Function to update React state from a StoredPromptSettings object
  const applyStateData = useCallback((data: StoredPromptSettings) => {
    // Use functional updates for setters if the new value depends on the old one,
    // or direct set if it's an absolute new value.
    // Only update if different to prevent unnecessary re-renders.
    setSystemPrompt(prev => (prev !== data.systemPrompt ? data.systemPrompt : prev));
    setUserPrompt(prev => (prev !== data.userPrompt ? data.userPrompt : prev));
    setMaxWords(prev => (prev !== data.maxWords ? data.maxWords : prev));
    setDefaultSystemPromptFromApi(prev => (prev !== data.defaultSystemPrompt ? data.defaultSystemPrompt : prev));
    setDefaultUserPromptFromApi(prev => (prev !== data.defaultUserPrompt ? data.defaultUserPrompt : prev));
    setDefaultMaxWordsFromApi(prev => (prev !== data.defaultMaxWords ? data.defaultMaxWords : prev));
  }, []); // Empty dependency array: this function's identity is stable.

  // Function to update localStorage.
  const updateLocalStorage = useCallback(
    (dataToStore: StoredPromptSettings) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(dataToStore));
        console.log(`[${purpose}] Synced data to localStorage:`, dataToStore);
      } catch (e) {
        console.error(`Error setting localStorage item for key "${storageKey}":`, e);
      }
    },
    [storageKey, purpose]
  ); // storageKey and purpose are stable.

  // Effect for initial load and re-fetching (SWR pattern)
  useEffect(() => {
    if (!fetchUrl) {
      setFetchError(`No fetch endpoint configured for purpose: ${purpose}`);
      setIsLoadingFetch(false);
      return;
    }

    let isMounted = true;
    const loadPrompts = async () => {
      if (isMounted) setIsLoadingFetch(true); // Set loading true at the start of the fetch process
      if (isMounted) setFetchError(null);
      let localDataAppliedInitially = false;

      // 1. Try to load from localStorage for initial fast display
      const storedDataJson = localStorage.getItem(storageKey);
      if (storedDataJson && isMounted) {
        try {
          const parsedData = JSON.parse(storedDataJson) as StoredPromptSettings;
          if (typeof parsedData.maxWords === "number") {
            // Basic validation
            console.log(`[${purpose}] Applying initial data from localStorage.`);
            applyStateData(parsedData);
            localDataAppliedInitially = true;
          }
        } catch (e) {
          console.warn(`[${purpose}] Malformed localStorage data during initial apply: ${e}`);
        }
      }
      // Even if local data applied, we are still "loading" until API confirms/updates.
      // setIsLoadingFetch(false) will be called in finally block.

      // 2. Always fetch from API
      try {
        console.log(`[${purpose}] Fetching from API: ${fetchUrl}`);
        const response = await fetch(fetchUrl);
        if (!response.ok) {
          let errorMsg = `Failed to fetch prompts (${response.status})`;
          try {
            const errData = await response.json();
            errorMsg = errData.message || errData.error || String(errData);
          } catch {}
          throw new Error(errorMsg);
        }
        const fetchedApiData = (await response.json()) as ApiFullPromptData;
        if (isMounted) {
          console.log(`[${purpose}] Successfully fetched from API.`);
          applyStateData(fetchedApiData); // Update state
          updateLocalStorage(fetchedApiData); // Sync to localStorage
        }
      } catch (error) {
        if (isMounted) {
          console.error(`Error fetching prompts from API for ${purpose}:`, error);
          setFetchError(error instanceof Error ? error.message : "An unknown fetch error occurred");
          if (!localDataAppliedInitially) {
            console.warn(`[${purpose}] API fetch failed and no valid localStorage. Initializing with app defaults.`);
            const defaultSettings = purpose === "article_summary"
                ? {
                    systemPrompt: default_single_article_systemPrompt,
                    userPrompt: default_single_article_userPromptInstructions,
                    maxWords: 150, // Or from a constant if you have one
                    defaultSystemPrompt: default_single_article_systemPrompt,
                    defaultUserPrompt: default_single_article_userPromptInstructions,
                    defaultMaxWords: 150,
                  }
                : {
                    // Assuming 'summary_of_summary'
                    systemPrompt: default_summary_of_summary_systemPrompt,
                    userPrompt: default_summary_of_summary_userPromptInstructions,
                    maxWords: 100, // Or from a constant
                    defaultSystemPrompt: default_summary_of_summary_systemPrompt,
                    defaultUserPrompt: default_summary_of_summary_userPromptInstructions,
                    defaultMaxWords: 100,
                  };
            applyStateData(defaultSettings); // Apply purpose-specific defaults
            updateLocalStorage(defaultSettings); // And store them
          }
        }
      } finally {
        if (isMounted) setIsLoadingFetch(false);
      }
    };

    loadPrompts();
    return () => {
      isMounted = false;
    };
  }, [fetchUrl, purpose, storageKey, triggerRefetch, applyStateData, updateLocalStorage]);
  // `applyStateData` and `updateLocalStorage` have stable identities due to useCallback with minimal deps.

  const savePrompts = useCallback(
    async (promptsToSave?: { systemPrompt: string; userPrompt: string; maxWords: number }) => {
      if (!updateUrl) {
        setUpdateError(`No update endpoint configured for purpose: ${purpose}`);
        return;
      }

      // Use stateRef to get the most current state values without adding them as dependencies to savePrompts
      const currentHookState = stateRef.current;

      const systemToSend = promptsToSave?.systemPrompt ?? currentHookState.systemPrompt ?? "";
      const userToSend = promptsToSave?.userPrompt ?? currentHookState.userPrompt ?? "";
      const maxWordsToSend = promptsToSave?.maxWords ?? currentHookState.maxWords ?? 150;

      setIsUpdating(true);
      setUpdateError(null);
      setIsUpdateSuccess(false);

      const payloadForApi = { systemPrompt: systemToSend, userPrompt: userToSend, maxWords: maxWordsToSend };

      try {
        const response = await fetch(updateUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadForApi),
        });
        if (!response.ok) {
          /* ... error handling ... */ throw new Error("API Update Failed");
        }

        const dataAfterSave: StoredPromptSettings = {
          systemPrompt: systemToSend,
          userPrompt: userToSend,
          maxWords: maxWordsToSend,
          defaultSystemPrompt: currentHookState.defaultSystemPromptFromApi ?? APP_DEFAULT_SETTINGS.defaultSystemPrompt,
          defaultUserPrompt: currentHookState.defaultUserPromptFromApi ?? APP_DEFAULT_SETTINGS.defaultUserPrompt,
          defaultMaxWords: currentHookState.defaultMaxWordsFromApi ?? APP_DEFAULT_SETTINGS.defaultMaxWords,
        };
        applyStateData(dataAfterSave); // Update React state
        updateLocalStorage(dataAfterSave); // Update localStorage
        setIsUpdateSuccess(true);
      } catch (error: unknown) {
        console.error(`Error updating prompts for ${purpose}:`, error);
        setUpdateError(error instanceof Error ? error.message : "An unknown update error occurred");
        setIsUpdateSuccess(false);
      } finally {
        setIsUpdating(false);
      }
    },
    [updateUrl, purpose, applyStateData, updateLocalStorage] // Removed state values from deps, uses stateRef
  );

  const resetUpdateStatus = useCallback(() => {
    setUpdateError(null);
    setIsUpdateSuccess(false);
  }, []);
  const forceRefetch = useCallback(() => {
    setTriggerRefetch(prev => prev + 1);
  }, []);

  return {
    systemPrompt,
    userPrompt,
    maxWords,
    defaultSystemPromptFromApi,
    defaultUserPromptFromApi,
    defaultMaxWordsFromApi,
    setSystemPrompt,
    setUserPrompt,
    setMaxWords,
    isLoadingFetch,
    isUpdating,
    fetchError,
    updateError,
    isUpdateSuccess,
    savePrompts,
    resetUpdateStatus,
    forceRefetch,
  };
};
