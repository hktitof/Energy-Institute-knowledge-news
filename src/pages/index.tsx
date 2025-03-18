// pages/index.tsx

import React, { ReactElement } from "react";
import { fetchCategories } from "../utils/utils";

// Import our custom hooks
import { useCategories } from "../hooks/useCategories";
import { useSearchTerms } from "../hooks/useSearchTerms";
import { useArticleFetching } from "../hooks/useArticleFetching";
import { useCategoryLinks } from "../hooks/useCategoryLinks";

import CategoryManager from "@/components/CategoryManager";
import LeftSidebar from "@/components/LeftSidebar";
import CategoryComponent from "../components/CategoryComponent";
import { NewsAggregatorProps } from "../utils/utils";

export default function NewsAggregator({ isTestMode = true }: NewsAggregatorProps): ReactElement {
  // Use our custom hooks to handle different concerns
  const {
    categories,
    setCategories,
    isLoading,
    deletingCategoryId,
    toggleCategoryTable,
    deleteCategory,
    newCategoryName,
    setNewCategoryName,
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

  // Log categories for debugging
  console.log("categories:", categories);
  console.log("isLoading:", isLoading);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left sidebar with categories */}
      <LeftSidebar
        categories={categories}
        setCategories={setCategories}
        isLoading={isLoading}
        deletingCategoryId={deletingCategoryId}
        toggleCategoryTable={toggleCategoryTable}
        deleteCategory={deleteCategory}
        loadingSearchTermId={loadingSearchTermId}
        removeSearchTerm={removeSearchTerm}
        categoriesFetching={categoriesFetching}
        setCategoriesFetching={setCategoriesFetching}
        categoriesStatus={categoriesStatus}
        refFetchNews={refFetchNews}
        fetchNewsForCategory={fetchNewsForCategory}
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
  );
}
