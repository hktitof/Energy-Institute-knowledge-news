// components/LeftSidebar.tsx

import React from "react";
// import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw } from "lucide-react";
import CategoryCard from "./CategoryCard";
import { Category, CategoryStatus } from "../utils/utils";

interface LeftSidebarProps {
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  isLoading: boolean;
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
    categories: Category[],
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
  isLoading,
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
  return (
    <div className="w-1/3 bg-white shadow-md flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 bg-white">
        <h1 className="text-2xl font-bold text-gray-800">News Aggregator</h1>
      </div>

      {/* Categories container with scroll */}
      <div className="flex-grow overflow-y-auto pb-20 pl-3 pr-3 pt-3">
        {/* Loading UI effect */}
        {isLoading && (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        )}

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
      </div>

      {/* Fixed bottom section for "Fetch All News" button */}
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
    </div>
  );
};

export default LeftSidebar;
