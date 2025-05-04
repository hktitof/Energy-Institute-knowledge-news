import { useState } from "react";
import axios from "axios";
import { fetchCategories } from "../utils/utils";
export const useSearchTerms = (categories, setCategories) => {
    const [loadingSearchTermId, setLoadingSearchTermId] = useState(null);
    const removeSearchTerm = async (categoryId, termIndex) => {
        const category = categories.find(cat => cat.id === categoryId);
        if (!category)
            return;
        const searchTerm = category.searchTerms[termIndex];
        if (!searchTerm)
            return;
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
        }
        catch (error) {
            console.error("Error deleting search term:", error);
            // Revert on error
            setCategories(categories);
        }
        finally {
            setLoadingSearchTermId(null);
        }
    };
    return {
        loadingSearchTermId,
        removeSearchTerm,
    };
};
