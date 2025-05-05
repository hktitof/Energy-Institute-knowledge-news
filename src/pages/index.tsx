// pages/index.tsx
import React, { ReactElement, useEffect, useState } from "react"; // Import useEffect
import { fetchCategories } from "../utils/utils";
import Head from "next/head";

// Import our custom hooks
import { useCategories } from "../hooks/useCategories";
import { useSearchTerms } from "../hooks/useSearchTerms";
import { useArticleFetching } from "../hooks/useArticleFetching";
import { useCategoryLinks } from "../hooks/useCategoryLinks";

import CategoryManager from "@/components/CategoryManager";
import LeftSidebar from "@/components/LeftSidebar";
import CategoryComponent from "../components/CategoryComponent";
import { NewsAggregatorProps } from "../utils/utils";

const BASE_TITLE = "Knowledge Note"; // Define base title

export default function NewsAggregator({ isTestMode = true }: NewsAggregatorProps): ReactElement {
  // Use our custom hooks to handle different concerns
  const {
    categories,
    setCategories,
    isLoading: isLoadingCategories,
    deletingCategoryId,
    toggleCategoryTable,
    deleteCategory,
    newCategoryName,
    setNewCategoryName,
    isRetrying: isRetryingCategories,
    retryCount: retryCountCategories,
    error: hasErrorCategories,
    updateCategories,
  } = useCategories({ isTestMode });

  const { loadingSearchTermId, removeSearchTerm } = useSearchTerms(categories, setCategories);

  const {
    categoriesFetching,
    setCategoriesFetching,
    isFetchingAllNewsByButton,
    categoriesStatus,
    refFetchNews,
    fetchNewsForCategory,
    fetchAllNews,
  } = useArticleFetching(categories, setCategories);

  const {
    // selectedCategoryId,
    setSelectedCategoryId,
    selectedCategoryName,
    setSelectedCategoryName,
    activeTab,
    setActiveTab,
  } = useCategoryLinks(categories, setCategories);

  // --- START: useState for Page Title ---
  const [pageTitle, setPageTitle] = useState(BASE_TITLE);

  // Log categories for debugging
  console.log("categories:", categories);

  useEffect(() => {
    // This effect now CALCULATES the desired title and updates the STATE
    console.log(`Title Calculation useEffect triggered. isFetchingAllNewsByButton: ${isFetchingAllNewsByButton}`);

    let dynamicTitlePart = "";

    if (isFetchingAllNewsByButton) {
      const totalCategories = categories.length;
      const currentlyFetchingIndex = categories.findIndex(cat => cat.isFetchingNewArticles === true);

      console.log(`Title Calculation useEffect: Found fetching index: ${currentlyFetchingIndex}`);

      if (currentlyFetchingIndex !== -1 && totalCategories > 0) {
        const currentNumber = currentlyFetchingIndex + 1;
        const percentage = Math.round((currentNumber / totalCategories) * 100);
        dynamicTitlePart = `Fetching (${percentage}%)... `;
      } else if (totalCategories > 0) {
        dynamicTitlePart = `Fetching (0%)... `;
        console.log(
          `Title Calculation useEffect: isFetchingAllNewsByButton is true, but no category has isFetchingNewArticles=true.`
        );
      } else {
        dynamicTitlePart = `Fetching... `;
      }
    }

    const newTitle = `${dynamicTitlePart}${BASE_TITLE}`;

    // Only update state if the title has actually changed
    if (newTitle !== pageTitle) {
      console.log(`Title Calculation useEffect: Setting pageTitle state to: "${newTitle}"`);
      setPageTitle(newTitle);
    } else {
      console.log(`Title Calculation useEffect: Title hasn't changed ("${newTitle}"), not setting state.`);
    }

    // NO cleanup needed here for resetting the title state itself
    // The state will naturally update when isFetchingAllNewsByButton becomes false
  }, [isFetchingAllNewsByButton, categories, pageTitle]); // Include pageTitle to compare against current state
  // --- END: useEffect for Calculating Title ---

  return (
    <>
      <Head>
        {/* Option 2 (Preferred): Let Next.js <Head> handle syncing state to document.title */}
        <title>{pageTitle}</title>
        <link rel="icon" href="/favicon-16x16.png" />
        <meta name="description" content="News aggregator application" />
      </Head>
      <div className="flex h-screen bg-gray-50">
        {/* Left sidebar with categories */}
        <LeftSidebar
          categories={categories}
          setCategories={setCategories}
          isLoadingCategories={isLoadingCategories}
          isRetryingCategories={isRetryingCategories}
          retryCountCategories={retryCountCategories}
          hasErrorCategories={hasErrorCategories}
          deletingCategoryId={deletingCategoryId}
          toggleCategoryTable={toggleCategoryTable}
          deleteCategory={deleteCategory}
          loadingSearchTermId={loadingSearchTermId}
          removeSearchTerm={removeSearchTerm}
          categoriesFetching={categoriesFetching}
          setCategoriesFetching={setCategoriesFetching}
          categoriesStatus={categoriesStatus}
          refFetchNews={refFetchNews}
          fetchNewsForCategory={(categoryId, customLinks, categories) => {
            fetchNewsForCategory(categoryId, customLinks, categories, setCategories);
            return Promise.resolve();
          }}
          fetchAllNews={fetchAllNews}
          isFetchingAllNewsByButton={isFetchingAllNewsByButton}
          setActiveTab={setActiveTab}
          setSelectedCategoryName={setSelectedCategoryName}
          fetchCategories={() => fetchCategories(setCategories)}
          setSelectedCategoryId={setSelectedCategoryId}
        />

        {/* Right content area */}
        <div className="w-2/3 overflow-y-auto">
          {/* Add Category and Search Terms Form */}
          <CategoryManager
            newCategoryName={newCategoryName}
            setNewCategoryName={setNewCategoryName}
            setCategories={setCategories}
            fetchCategories={fetchCategories}
            setActiveTab={setActiveTab}
            activeTab={activeTab}
            selectedCategoryName={selectedCategoryName || ""}
            categories={categories}
            updateCategories={updateCategories}
          />

          {/* Articles Tables */}
          {categories.map(
            category =>
              category.showTable && (
                <CategoryComponent
                  key={`table-${category.id}`}
                  category={category}
                  categories={categories}
                  setCategories={setCategories}
                />
              )
          )}
        </div>
      </div>
    </>
  );
}
