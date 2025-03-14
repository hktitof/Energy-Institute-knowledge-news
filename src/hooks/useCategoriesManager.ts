import { useEffect, useState, useRef } from "react";
import { Category } from "../utils/utils";

type FetchCategoriesFunction = (setCategories: React.Dispatch<React.SetStateAction<Category[]>>) => Promise<void>;

type UseCategoriesManagerProps = {
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  fetchCategoriesFunction: FetchCategoriesFunction;
  sampleData: Category[];
  isTestMode?: boolean;
};

type UseCategoriesManagerReturn = {
  isLoading: boolean;
};

/**
 * Custom hook to manage categories fetching with testing mode support
 * Works with your existing categories state
 *
 * @param {Array} categories - Your existing categories state
 * @param {Function} setCategories - Your existing setCategories function
 * @param {Function} fetchCategoriesFunction - Function to fetch categories from database
 * @param {Array} sampleData - Sample categories data for testing
 * @param {boolean} isTestMode - Whether to use sample data (true) or fetch from DB (false)
 */

const useCategoriesManager = ({
  categories,
  setCategories,
  fetchCategoriesFunction,
  sampleData,
  isTestMode = false,
}: UseCategoriesManagerProps): UseCategoriesManagerReturn => {
  const categoriesProcessed = useRef(false);
  const [isLoading, setIsLoading] = useState(false);

  // Effect for initial data loading
  useEffect(() => {
    if (isTestMode) {
      console.log("TEST MODE: Using sample categories data");
      setCategories(sampleData);
    } else {
      console.log("PRODUCTION MODE: Fetching categories from database");
      setIsLoading(true);
      fetchCategoriesFunction(setCategories).finally(() => {
        setIsLoading(false);
      });
    }
  }, [fetchCategoriesFunction, sampleData, isTestMode, setCategories]);

  // Optional effect for first-time processing of categories
  useEffect(() => {
    console.log("Categories useEffect running, current categories:", categories);

    // Check if categories is not an empty array and hasn't been processed yet
    if (isTestMode && categories.length > 0 && !categoriesProcessed.current) {
      console.log("Processing categories for the first time");

      // Any special processing like selecting the first item can go here

      // Mark that we've processed categories to prevent this from running again
      categoriesProcessed.current = true;

      if (categories.length > 0) {
        console.log("Categories processed, selected:", categories[0].name);
      }
    }
  }, [categories, isTestMode]);
  return { isLoading };
};

export default useCategoriesManager;
