// components/LeftSidebar.tsx

import React from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";
import CategoryCard from "./CategoryCard";
import { Category, CategoryStatus } from "../utils/utils";

interface LeftSidebarProps {
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  isLoadingCategories: boolean;
  isRetryingCategories: boolean;
  retryCountCategories: number;
  hasErrorCategories: string | null; // Added this prop
  deletingCategoryId: string | null;
  toggleCategoryTable: (categoryId: string | number) => void;
  deleteCategory: (categoryId: string, e: React.MouseEvent) => void;
  loadingSearchTermId: number | null;
  removeSearchTerm: (categoryId: string | number, termIndex: number) => void;
  categoriesFetching: string | number | null;
  setCategoriesFetching: React.Dispatch<React.SetStateAction<string | number | null>>;
  categoriesStatus: CategoryStatus[];
  refFetchNews: React.RefObject<HTMLSpanElement | null>;
  fetchNewsForCategory: (
    categoryId: string | number,
    customLinks: string[] | string[] | undefined,
    categories: Category[]
  ) => Promise<void>;
  fetchAllNews: () => void;
  isFetchingAllNewsByButton: boolean;
  setActiveTab: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedCategoryName: React.Dispatch<React.SetStateAction<string | null>>;
  fetchCategories: () => Promise<void>;
  setSelectedCategoryId: React.Dispatch<React.SetStateAction<string | number | null>>;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({
  categories,
  setCategories,
  isLoadingCategories,
  isRetryingCategories,
  retryCountCategories,
  hasErrorCategories,
  deletingCategoryId,
  toggleCategoryTable,
  deleteCategory,
  loadingSearchTermId,
  removeSearchTerm,
  categoriesFetching,
  setCategoriesFetching,
  categoriesStatus,
  refFetchNews,
  fetchNewsForCategory,
  fetchAllNews,
  isFetchingAllNewsByButton,
  setActiveTab,
  setSelectedCategoryName,
  fetchCategories,
  setSelectedCategoryId,
}) => {
  // Render function for different loading states
  const renderLoadingStates = () => {
    // Initial loading
    if (isLoadingCategories && !isRetryingCategories) {
      return (
        <div className="flex flex-col justify-center items-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
          <p className="text-gray-600">Loading categories...</p>
        </div>
      );
    }

    // Retrying state
    if (isRetryingCategories) {
      return (
        <div className="flex flex-col justify-center items-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-indigo-600 font-medium">Database is resuming...</p>
          <p className="text-gray-500 mt-2">Retry attempt {retryCountCategories} of 3</p>
          <button
            onClick={fetchCategories}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
          >
            Try again now
          </button>
        </div>
      );
    }

    // Error state
    if (hasErrorCategories) {
      return (
        <div className="flex flex-col justify-center items-center h-full">
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4 flex items-center">
            <AlertTriangle className="mr-2" />
            <span>Failed to load categories</span>
          </div>
          <p className="text-gray-600 mb-4">The database might be unavailable or still resuming.</p>
          <button
            onClick={
              // refrech the page
              () => window.location.reload()
            }
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition hover:cursor-pointer"
          >
            Refresh the page
          </button>
        </div>
      );
    }

    // Normal state with categories
    return (
      <>
        {/* Categories listed here */}
        {categories.map(category => (
          <CategoryCard
            key={category.id}
            category={category}
            categories={categories}
            setCategories={setCategories}
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
            setActiveTab={setActiveTab}
            setSelectedCategoryName={setSelectedCategoryName}
            fetchCategories={fetchCategories}
            setSelectedCategoryId={setSelectedCategoryId}
          />
        ))}
      </>
    );
  };

  console.log("States:", {
    isLoadingCategories,
    isRetryingCategories,
    retryCountCategories,
    hasErrorCategories,
  });

  return (
    <div className="w-1/3 bg-white shadow-md flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 bg-white">
        <img src="/energy-institute-logo.svg" alt="The Energy Institute" className="h-10 w-auto" />{" "}
      </div>

      {/* Categories container with scroll */}
      <div className="flex-grow overflow-y-auto pb-20 pl-3 pr-3 pt-3">{renderLoadingStates()}</div>

      {/* Fixed bottom section for "Fetch All News" button */}
      {!isLoadingCategories && !hasErrorCategories && categories.length > 0 && (
        <div className="absolute bottom-0 left-0 w-1/3 p-4 bg-white border-t border-gray-200">
          <button
            className={`w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition shadow-md flex items-center justify-center gap-1
            ${isFetchingAllNewsByButton ? "opacity-50 hover:cursor-wait" : "hover:cursor-pointer"}
            `}
            onClick={() => fetchAllNews()}
            disabled={isFetchingAllNewsByButton}
          >
            {isFetchingAllNewsByButton ? (
              <RefreshCw className="animate-spin text-white" size={14} />
            ) : (
              <RefreshCw size={14} />
            )}
            <span key="fetch-all-news">{isFetchingAllNewsByButton ? "Fetching All News" : "Fetch All News"}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default LeftSidebar;
