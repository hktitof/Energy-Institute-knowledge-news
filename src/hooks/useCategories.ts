import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Category, fetchCategories } from "../utils/utils";
import { sampleCategory } from "@/utils/sampleCategory";

interface UseCategoriesProps {
  isTestMode?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

// New function to refetch categories
export const refetchCategories = async (setCategories: React.Dispatch<React.SetStateAction<Category[]>>) => {
  try {
    await fetchCategories(setCategories);
    return true;
  } catch (error) {
    console.error("Error refetching categories:", error);
    toast.error("Failed to update categories");
    return false;
  }
};

// Define the structure for article updates
interface UpdateArticlePayload {
  categoryId: number | string; // Match your Category ID type
  articleId: string; // Match your Article ID type
  newDetails: {
    title?: string;
    summary?: string;
  };
}

// Name for the global object - use something unique
const NEXT_APP_STATE_ACCESSOR = "__MY_CATEGORY_APP_STATE_ACCESSOR__";

declare global {
  interface Window {
    [NEXT_APP_STATE_ACCESSOR]:
      | {
          getState: () => Category[];
          updateArticle: (payload: UpdateArticlePayload) => { success: boolean; error?: string };
        }
      | undefined;
  }
}

export const useCategories = ({ isTestMode = false, maxRetries = 5, retryDelay = 3000 }: UseCategoriesProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const isLoadingChangeCount = useRef(0);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState<string>("");

  // --- Refs to access state and setters from window functions ---
  const categoriesRef = useRef(categories);
  const setCategoriesRef = useRef(setCategories);

  // Keep refs updated
  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);
  useEffect(() => {
    setCategoriesRef.current = setCategories;
  }, []); // setCategories identity is stable

  // Load categories with retry logic
  const loadCategories = useCallback(
    async (retry = 0) => {
      setIsLoading(true);
      setError(null);

      if (retry > 0) {
        setIsRetrying(true);
        setRetryCount(retry);
      }

      try {
        if (isTestMode) {
          setCategories(sampleCategory);
        } else {
          // set isLoading to true
          await fetchCategories(setCategories); // This waits for the API call
        }
        setIsRetrying(false);
        setRetryCount(0);
      } catch (error) {
        console.error("Failed to load categories:", error);

        // Check if it's a database resuming issue (503)
        if (axios.isAxiosError(error) && error.response?.status === 503) {
          const errorMsg = "Database is resuming. Retrying...";
          setError(errorMsg);

          if (retry < maxRetries) {
            // Wait and retry
            toast.info(
              `Database is resuming. Retrying in ${retryDelay / 1000} seconds... (${retry + 1}/${maxRetries})`
            );
            setTimeout(() => loadCategories(retry + 1), retryDelay);
            return;
          } else {
            toast.error(`Failed to load categories after ${maxRetries} retries. Database might be unavailable.`);
          }
        } else {
          setError("Failed to load categories");
          toast.error("Failed to load categories");
        }

        setIsRetrying(false);
      } finally {
        if (!isRetrying) {
          setIsLoading(false);
        }
      }
    },
    [isRetrying, isTestMode, maxRetries, retryDelay]
  );

  // Manually trigger reload
  const reloadCategories = useCallback(() => {
    loadCategories(0);
  }, [loadCategories]);

  // Add a convenience method that uses the external refetchCategories function
  const updateCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      // set isLoading to true
      setIsLoading(true);
      await refetchCategories(setCategories);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load categories on component mount
  useEffect(() => {
    loadCategories(0);
  }, [loadCategories]);

  // Add this effect to track changes
  useEffect(() => {
    isLoadingChangeCount.current += 1;
    console.log(`isLoading changed to ${isLoading} (Total changes: ${isLoadingChangeCount.current})`);
  }, [isLoading]);

  // Toggle category expansion
  const toggleCategoryTable = (categoryId: number | string) => {
    setCategories(
      categories.map((category: Category) => ({
        ...category,
        showTable: category.id === categoryId ? !category.showTable : false,
      }))
    );
  };

  // Delete category
  const deleteCategory = async (categoryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingCategoryId(categoryId);

    try {
      await axios.delete("/api/categories/delete", {
        data: { categoryId },
      });

      setCategories(prevCategories => prevCategories.filter(category => category.id !== Number(categoryId)));
      toast.success("Category deleted successfully");
    } catch (error) {
      console.error("Error deleting category:", error);

      if (axios.isAxiosError(error)) {
        // Handle 503 for delete operation as well
        if (error.response?.status === 503) {
          toast.error("Database is resuming. Please try again in a few moments.");
        } else {
          const errorMessage = error.response?.data?.error || "Failed to delete category";
          toast.error(errorMessage);
        }
      } else {
        toast.error("Failed to delete category");
      }
    } finally {
      setDeletingCategoryId(null);
    }
  };

  // --- Function to update a specific article state ---
  const updateArticleInState = useCallback(({ categoryId, articleId, newDetails }: UpdateArticlePayload) => {
    console.log(
      `[NextApp] Received request to update article: categoryId=${categoryId}, articleId=${articleId}`,
      newDetails
    );
    setCategoriesRef.current(prevCategories => {
      return prevCategories.map(category => {
        // Ensure consistent type comparison (string vs number) if needed
        if (String(category.id) === String(categoryId)) {
          return {
            ...category,
            articles: category.articles.map(article => {
              if (article.id === articleId) {
                console.log(`[NextApp] Updating article "${article.title}" to "${newDetails.title}"`);
                return {
                  ...article,
                  title: newDetails.title ?? article.title, // Update only if provided
                  summary: newDetails.summary ?? article.summary,
                };
              }
              return article;
            }),
          };
        }
        return category;
      });
    });
    // Optionally, add a toast notification here
    // toast.info(`Article updated internally: ${newDetails.title}`);
  }, []); // Depends only on the stable setCategoriesRef

  // --- Expose functions to the window object on mount ---
  useEffect(() => {
    console.log("[NextApp] Attempting to expose state accessor functions to window...");

    const accessorObject = {
      // Create the object first
      getState: () => {
        console.log("[NextApp] getState called by extension/injected script");
        try {
          return JSON.parse(JSON.stringify(categoriesRef.current));
        } catch (e) {
          console.error("[NextApp] Error stringifying state for extension:", e);
          return [];
        }
      },
      updateArticle: (payload: UpdateArticlePayload) => {
        if (payload && payload.categoryId && payload.articleId && payload.newDetails) {
          updateArticleInState(payload);
          return { success: true };
        } else {
          console.error("[NextApp] Invalid payload received for updateArticle:", payload);
          return { success: false, error: "Invalid payload structure" };
        }
      },
    };

    // Assign the object to the window property
    window[NEXT_APP_STATE_ACCESSOR] = accessorObject;

    // --- ADD THIS LOG ---
    // Log the specific window property right after assigning it
    console.log(`[NextApp] window[${NEXT_APP_STATE_ACCESSOR}] assigned. Value:`, window[NEXT_APP_STATE_ACCESSOR]);
    // You can also specifically check the type of getState
    if (window[NEXT_APP_STATE_ACCESSOR]) {
      console.log(
        `[NextApp] typeof window[${NEXT_APP_STATE_ACCESSOR}].getState:`,
        typeof window[NEXT_APP_STATE_ACCESSOR].getState
      );
    } else {
      console.warn(
        `[NextApp] window[${NEXT_APP_STATE_ACCESSOR}] is still undefined immediately after assignment attempt!`
      );
    }
    // --- END OF ADDED LOG ---

    return () => {
      console.log("[NextApp] Cleaning up state accessor functions from window");
      delete window[NEXT_APP_STATE_ACCESSOR];
    };
  }, [updateArticleInState]);

  return {
    categories,
    setCategories,
    isLoading,
    isRetrying,
    retryCount,
    error,
    deletingCategoryId,
    toggleCategoryTable,
    deleteCategory,
    newCategoryName,
    setNewCategoryName,
    reloadCategories,
    updateCategories, // Expose the new method
  };
};
