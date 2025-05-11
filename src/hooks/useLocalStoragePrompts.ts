// hooks/useLocalStoragePrompts.ts
"use client"; // Ensure this is at the top of the hook file
import { useState, useEffect, useCallback } from "react";

// --- Type Definitions (now inside the hook file) ---
interface StoredPromptSettings {
  systemPrompt?: string;
  userPrompt?: string;
  maxWords?: number;
  defaultSystemPrompt?: string;
  defaultUserPrompt?: string;
  defaultMaxWords?: number;
}

interface ResolvedPromptSettings {
  systemPrompt: string;
  userPrompt: string;
  maxWords: number;
}
// --- End Type Definitions ---

const ARTICLE_PROMPT_LS_KEY = "promptSettings_article_summary";
const SUMMARY_OF_SUMMARY_PROMPT_LS_KEY = "promptSettings_summary_of_summary";

const loadAndResolveSettingsFromLocalStorage = (key: string): ResolvedPromptSettings => {
  if (typeof window === "undefined" || !window.localStorage) {
    const errorMessage = `LocalStorage not available on the client when attempting to load key: ${key}. This is a critical issue.`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  const storedSettingsString = localStorage.getItem(key);

  if (!storedSettingsString) {
    const errorMessage = `'${key}' not found in LocalStorage. This violates the assumption of pre-populated data.`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  try {
    const parsedSettings = JSON.parse(storedSettingsString) as StoredPromptSettings;

    const systemPrompt = parsedSettings.systemPrompt || parsedSettings.defaultSystemPrompt;
    const userPrompt = parsedSettings.userPrompt || parsedSettings.defaultUserPrompt;
    const maxWords = parsedSettings.maxWords || parsedSettings.defaultMaxWords;

    if (systemPrompt === undefined || userPrompt === undefined || maxWords === undefined) {
      const errorMessage = `Critical prompt fields missing in parsed LocalStorage for key '${key}'. Data: ${JSON.stringify(
        parsedSettings
      )}`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    return {
      systemPrompt: systemPrompt as string,
      userPrompt: userPrompt as string,
      maxWords: maxWords as number,
    };
  } catch (e: unknown) {
    const errorMessage = `Failed to parse '${key}' from LocalStorage or critical fields missing. Error: ${
      e instanceof Error ? e.message : String(e)
    }`;
    console.error(errorMessage, "Original string:", storedSettingsString);
    throw new Error(errorMessage);
  }
};

const useLocalStoragePrompts = () => {
  const [articlePromptSettings, setArticlePromptSettings] = useState<ResolvedPromptSettings | null>(null);
  const [summaryOfSummaryPromptSettings, setSummaryOfSummaryPromptSettings] = useState<ResolvedPromptSettings | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    try {
      const articleSettings = loadAndResolveSettingsFromLocalStorage(ARTICLE_PROMPT_LS_KEY);
      setArticlePromptSettings(articleSettings);

      const sosSettings = loadAndResolveSettingsFromLocalStorage(SUMMARY_OF_SUMMARY_PROMPT_LS_KEY);
      setSummaryOfSummaryPromptSettings(sosSettings);
    } catch (e: unknown) {
      console.error("Error initializing LocalStorage prompts in hook:", e);
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorageChange = (event: StorageEvent) => {
      try {
        if (event.key === ARTICLE_PROMPT_LS_KEY) {
          const newSettings = loadAndResolveSettingsFromLocalStorage(ARTICLE_PROMPT_LS_KEY);
          setArticlePromptSettings(newSettings);
        } else if (event.key === SUMMARY_OF_SUMMARY_PROMPT_LS_KEY) {
          const newSettings = loadAndResolveSettingsFromLocalStorage(SUMMARY_OF_SUMMARY_PROMPT_LS_KEY);
          setSummaryOfSummaryPromptSettings(newSettings);
        }
      } catch (e: unknown) {
        console.error("Error reloading settings on storage change:", e);
        setError(e instanceof Error ? e : new Error(String(e)));
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const updateSettings = useCallback(
    (
      key: string,
      newSettings: Partial<ResolvedPromptSettings>,
      setStateFunction: React.Dispatch<React.SetStateAction<ResolvedPromptSettings | null>>
    ) => {
      if (typeof window !== "undefined" && window.localStorage) {
        setStateFunction(prevState => {
          if (!prevState) {
            const forcedResolvedNewSettings: ResolvedPromptSettings = {
              systemPrompt: newSettings.systemPrompt || "",
              userPrompt: newSettings.userPrompt || "",
              maxWords: newSettings.maxWords || 0,
            };
            const objectToStoreForced: StoredPromptSettings = {
              systemPrompt: forcedResolvedNewSettings.systemPrompt,
              userPrompt: forcedResolvedNewSettings.userPrompt,
              maxWords: forcedResolvedNewSettings.maxWords,
              defaultSystemPrompt: forcedResolvedNewSettings.systemPrompt,
              defaultUserPrompt: forcedResolvedNewSettings.userPrompt,
              defaultMaxWords: forcedResolvedNewSettings.maxWords,
            };
            try {
              localStorage.setItem(key, JSON.stringify(objectToStoreForced));
              return forcedResolvedNewSettings;
            } catch (saveError) {
              console.error(`Error saving '${key}' to LocalStorage (from null state):`, saveError);
              return null;
            }
          }

          const resolvedNewSettings: ResolvedPromptSettings = {
            systemPrompt: newSettings.systemPrompt ?? prevState.systemPrompt,
            userPrompt: newSettings.userPrompt ?? prevState.userPrompt,
            maxWords: newSettings.maxWords ?? prevState.maxWords,
          };

          const currentStoredString = localStorage.getItem(key);
          let currentStoredObject: StoredPromptSettings = {};
          if (currentStoredString) {
            try {
              currentStoredObject = JSON.parse(currentStoredString);
            } catch {
              /* If parsing fails, new object will overwrite */
            }
          }

          const objectToStore: StoredPromptSettings = {
            ...currentStoredObject,
            systemPrompt: resolvedNewSettings.systemPrompt,
            userPrompt: resolvedNewSettings.userPrompt,
            maxWords: resolvedNewSettings.maxWords,
            defaultSystemPrompt: resolvedNewSettings.systemPrompt,
            defaultUserPrompt: resolvedNewSettings.userPrompt,
            defaultMaxWords: resolvedNewSettings.maxWords,
          };

          try {
            localStorage.setItem(key, JSON.stringify(objectToStore));
            return resolvedNewSettings;
          } catch (saveError) {
            console.error(`Error saving '${key}' to LocalStorage:`, saveError);
            return prevState;
          }
        });
      }
    },
    []
  );

  const updateArticlePromptSettings = useCallback(
    (newSettings: Partial<ResolvedPromptSettings>) => {
      updateSettings(ARTICLE_PROMPT_LS_KEY, newSettings, setArticlePromptSettings);
    },
    [updateSettings]
  ); // updateSettings is stable due to useCallback([])

  const updateSummaryOfSummaryPromptSettings = useCallback(
    (newSettings: Partial<ResolvedPromptSettings>) => {
      updateSettings(SUMMARY_OF_SUMMARY_PROMPT_LS_KEY, newSettings, setSummaryOfSummaryPromptSettings);
    },
    [updateSettings]
  ); // updateSettings is stable

  return {
    articlePromptSettings,
    summaryOfSummaryPromptSettings,
    updateArticlePromptSettings,
    updateSummaryOfSummaryPromptSettings,
    isLoading,
    error,
  };
};

export default useLocalStoragePrompts;
