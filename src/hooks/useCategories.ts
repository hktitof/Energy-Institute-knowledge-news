import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Category, fetchCategories } from "../utils/utils";
import { sampleCategory } from "@/utils/sampleCategory";

interface UseCategoriesProps {
  isTestMode?: boolean;
}

export const useCategories = ({ isTestMode = false }: UseCategoriesProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState<string>("");

  // Load categories on component mount
  useEffect(() => {
    const loadCategories = async () => {
      setIsLoading(true);
      try {
        if (isTestMode) {
          setCategories(sampleCategory);
        } else {
          await fetchCategories(setCategories);
        }
      } catch (error) {
        console.error("Failed to load categories:", error);
        toast.error("Failed to load categories");
      } finally {
        setIsLoading(false);
      }
    };

    loadCategories();
  }, [isTestMode]);

  // Toggle category expansion
  const toggleCategoryTable = (categoryId: number) => {
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
        const errorMessage = error.response?.data?.error || "Failed to delete category";
        toast.error(errorMessage);
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
    deletingCategoryId,
    toggleCategoryTable,
    deleteCategory,
    newCategoryName,
    setNewCategoryName
  };
};
