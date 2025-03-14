import { useEffect, useRef } from "react";

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
const useCategoriesManager = (categories, setCategories, fetchCategoriesFunction, sampleData, isTestMode = false) => {
  const categoriesProcessed = useRef(false);

  // Effect for initial data loading - either sample data or real fetch
  useEffect(() => {
    if (isTestMode) {
      console.log("TEST MODE: Using sample categories data");
      setCategories(sampleData);
    } else {
      console.log("PRODUCTION MODE: Fetching categories from database");
      fetchCategoriesFunction(setCategories);
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
};

export default useCategoriesManager;
