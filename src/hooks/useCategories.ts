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

export const useCategories = ({ isTestMode = false, maxRetries = 5, retryDelay = 3000 }: UseCategoriesProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const isLoadingChangeCount = useRef(0);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState<string>("");

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
