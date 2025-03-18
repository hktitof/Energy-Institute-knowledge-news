import { useState } from "react";
import axios from "axios";
import { Category } from "../utils/utils";
import { fetchCategories } from "../utils/utils";

export const useSearchTerms = (
  categories: Category[],
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>
) => {
  const [loadingSearchTermId, setLoadingSearchTermId] = useState<number | null>(null);

  const removeSearchTerm = async (categoryId: string | number, termIndex: number) => {
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) return;

    const searchTerm = category.searchTerms[termIndex];
    if (!searchTerm) return;

    setLoadingSearchTermId(termIndex);

    // Optimistic UI update
    const updatedCategories = categories.map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          searchTerms: cat.searchTerms.filter((_, index) => index !== termIndex),
        };
      }
      return cat;
    });
    setCategories(updatedCategories);

    try {
      // API Call
      await axios.delete("/api/searchTerms/delete", {
        data: { searchTerm },
      });

      // Refresh categories
      fetchCategories(setCategories);
    } catch (error) {
      console.error("Error deleting search term:", error);
      // Revert on error
      setCategories(categories);
    } finally {
      setLoadingSearchTermId(null);
    }
  };

  return {
    loadingSearchTermId,
    removeSearchTerm,
  };
};
