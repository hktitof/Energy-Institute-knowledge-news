// components/CategoryCard.tsx

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, X, ExternalLink, Loader, Trash2, RefreshCw, Globe } from "lucide-react";
import { Category, CategoryStatus } from "../utils/utils";
import CategoryActionButtons from "./CategoryActionButtons";
import LinkList from "./LinkList";

interface CategoryCardProps {
  category: Category;
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  deletingCategoryId: string | null;
  toggleCategoryTable: (categoryId: string | number) => void;
  deleteCategory: (categoryId: string, e: React.MouseEvent) => void;
  loadingSearchTermId: number | null;
  removeSearchTerm: (categoryId: string | number, termIndex: number) => void;
  categoriesFetching: string | number | null;
  setCategoriesFetching: React.Dispatch<React.SetStateAction<string | number | null>>;
  categoriesStatus: CategoryStatus[];
  refFetchNews: React.RefObject<HTMLSpanElement | null>;
  fetchNewsForCategory: (categoryId: string | number, customLinks: string[], categories: Category[]) => Promise<void>;
  setActiveTab: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedCategoryName: React.Dispatch<React.SetStateAction<string | null>>;
  fetchCategories: () => Promise<void>;
  setSelectedCategoryId: React.Dispatch<React.SetStateAction<string | number | null>>;
}

const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  categories,
  setCategories,
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
  setActiveTab,
  setSelectedCategoryName,
  fetchCategories,
  setSelectedCategoryId,
}) => {
  return (
    <div className="border rounded-md border-gray-300 mb-4 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 bg-white">
      <motion.div
        className="p-5 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors duration-200"
        onClick={() => {
          toggleCategoryTable(category.id);
          setActiveTab(null);
          setSelectedCategoryName(category.name);
        }}
      >
        <div className="flex items-center space-x-3">
          <h2 className="text-lg font-semibold text-gray-800">{category.name}</h2>
          <div className="flex space-x-2">
            <span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full">
              {category.searchTerms.length} terms
            </span>
            {category.links && (
              <span className="bg-purple-100 text-purple-600 text-xs px-2 py-1 rounded-full">
                {category.links.length} links
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <a
            href={`https://www.google.co.uk/search?q=${encodeURIComponent(
              category.searchTerms.join(" OR ")
            )}&tbm=nws&tbs=qdr:w`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full text-gray-500 hover:bg-blue-50 hover:text-blue-500 transition-colors duration-200"
            onClick={e => e.stopPropagation()}
            title="Open in Google News"
          >
            <ExternalLink size={18} />
          </a>
          {/* add a checked icon if isFetchedAllArticles of categoriesStatus for this category is true */}
          {categoriesStatus.find(status => status.categoryId === category.id)?.isFetchedAllArticles && (
            <span className="p-2 rounded-full text-green-500 bg-green-50">
              <RefreshCw size={18} />
            </span>
          )}
          <button
            className="p-2 rounded-full text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors duration-200 hover:cursor-pointer"
            onClick={e => deleteCategory(category.id.toString(), e)}
            disabled={deletingCategoryId === category.id.toString()}
            title="Remove category"
          >
            {deletingCategoryId === category.id.toString() ? (
              <Loader size={18} className="animate-spin text-red-500" />
            ) : (
              <Trash2 size={18} />
            )}
          </button>
          <button
            className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors duration-200"
            onClick={e => {
              e.stopPropagation();
              if (category.showTable) {
                toggleCategoryTable(category.id);
              }
            }}
          >
            {category.showTable ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {(category.showTable || categoriesFetching === category.id) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="px-5 pb-5 pt-0 overflow-hidden"
          >
            {/* Search Terms Section */}
            <SearchTermsSection
              category={category}
              loadingSearchTermId={loadingSearchTermId}
              removeSearchTerm={removeSearchTerm}
            />

            {/* Links Section */}
            <CategoryLinksSection
              category={category}
              setCategories={setCategories}
              fetchCategories={fetchCategories}
              setSelectedCategoryName={setSelectedCategoryName}
              setActiveTab={setActiveTab}
              setSelectedCategoryId={setSelectedCategoryId}
            />

            {/* Action Buttons */}
            <CategoryActionButtons
              category={category}
              categories={categories}
              setCategories={setCategories}
              categoriesStatus={categoriesStatus}
              setCategoriesFetching={setCategoriesFetching}
              fetchNewsForCategory={fetchNewsForCategory}
              refFetchNews={refFetchNews}
              setSelectedCategoryName={setSelectedCategoryName}
              setActiveTab={setActiveTab}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Search Terms Section Component
interface SearchTermsSectionProps {
  category: Category;
  loadingSearchTermId: number | null;
  removeSearchTerm: (categoryId: string | number, termIndex: number) => void;
}

const SearchTermsSection: React.FC<SearchTermsSectionProps> = ({ category, loadingSearchTermId, removeSearchTerm }) => {
  if (category.searchTerms.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      <div className="flex flex-wrap gap-2">
        {category.searchTerms.map((term, index) => (
          <div key={index} className="flex items-center bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full shadow-sm">
            <span className="text-sm font-medium">{term}</span>
            <button
              className={`ml-1.5 rounded-full p-0.5 ${
                loadingSearchTermId === index
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-blue-500 hover:text-red-500 hover:bg-blue-100 transition-colors duration-200 hover:cursor-pointer"
              }`}
              onClick={() => removeSearchTerm(category.id, index)}
              disabled={loadingSearchTermId === index}
            >
              {loadingSearchTermId === index ? <Loader size={14} className="animate-spin" /> : <X size={14} />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// Category Links Section Component
interface CategoryLinksSectionProps {
  category: Category;
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  fetchCategories: () => Promise<void>;
  setSelectedCategoryName: React.Dispatch<React.SetStateAction<string | null>>;
  setActiveTab: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedCategoryId: React.Dispatch<React.SetStateAction<string | number | null>>;
}

const CategoryLinksSection: React.FC<CategoryLinksSectionProps> = ({
  category,
  setCategories,
  fetchCategories,
  setSelectedCategoryName,
  setActiveTab,
  setSelectedCategoryId,
}) => {
  if (!category.links || category.links.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-gray-700">Saved Links</h3>
      </div>

      {category.links.length <= 5 ? (
        <LinkList fetchCategories={fetchCategories} category={category} setCategories={setCategories} />
      ) : (
        // Grid with pagination for many links
        <div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            {category.links.slice(0, 6).map((link, index) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center p-2 rounded-md hover:bg-gray-50 border border-gray-100 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <Globe size={14} className="text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700 font-medium truncate">{link.title || "Untitled"}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-1">{link.url}</p>
                </div>
                <button
                  className="p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={e => {
                    e.preventDefault();
                    // Remove link function - would need to be implemented
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </a>
            ))}
          </div>

          {category.links.length > 6 && (
            <div className="flex justify-between items-center text-sm text-gray-500">
              <span>Showing 6 of {category.links.length} links</span>
              <button
                onClick={() => {
                  setSelectedCategoryName(category.name);
                  setActiveTab("links");
                  setSelectedCategoryId(category.id);
                }}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:cursor-pointer"
              >
                View all links
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CategoryCard;
