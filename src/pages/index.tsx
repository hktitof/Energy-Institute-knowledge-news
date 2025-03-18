// pages/index.js

import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, X, ExternalLink, Loader, Trash2, RefreshCw, Link, Globe } from "lucide-react";
import { fetchCategories } from "../utils/utils";

import CategoryManager from "@/components/CategoryManager";
import LinkList from "@/components/LinkList";
import CategoryComponent from "../components/CategoryComponent";

// Import our custom hooks
import { useCategories } from "../hooks/useCategories";
import { useSearchTerms } from "../hooks/useSearchTerms";
import { useArticleFetching } from "../hooks/useArticleFetching";
import { useCategoryLinks } from "../hooks/useCategoryLinks";

export default function NewsAggregator() {
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
  } = useCategories({ isTestMode: false });

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
    selectedCategoryId,
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
      <div className="w-1/3 bg-white shadow-md flex flex-col h-full">
        <div className="p-4 border-b border-gray-200 bg-white">
          <h1 className="text-2xl font-bold text-gray-800">News Aggregator</h1>
        </div>

        {/* Categories container with scroll */}
        <div className="flex-grow overflow-y-auto pb-20 pl-3 pr-3 pt-3">
          {/* // add Loading UI effect by checking isLoading */}
          {isLoading && (
            // add a div that will be shown when the categories been fetching, use isLoading to check that and update UI perfectly
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
          )}

          {categories.map(category => (
            <div
              key={category.id}
              className="border rounded-md border-gray-300 mb-4 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 bg-white"
            >
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
                  {/* add a checked icon if isFetchedAllArticles of categoriesStatus for this category is is true */}
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
                    {category.searchTerms.length > 0 && (
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-2">
                          {category.searchTerms.map((term, index) => (
                            <div
                              key={index}
                              className="flex items-center bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full shadow-sm"
                            >
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
                                {loadingSearchTermId === index ? (
                                  <Loader size={14} className="animate-spin" />
                                ) : (
                                  <X size={14} />
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Links Section with Pagination */}
                    {category.links && category.links.length > 0 && (
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-sm font-medium text-gray-700">Saved Links</h3>
                        </div>

                        {/* Links Grid/List with conditional rendering based on number of links */}
                        {category.links.length <= 5 ? (
                          <LinkList
                            fetchCategories={fetchCategories}
                            category={category}
                            setCategories={setCategories}
                          />
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
                                      <span className="text-sm text-gray-700 font-medium truncate">
                                        {link.title || "Untitled"}
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-500 truncate mt-1">{link.url}</p>
                                  </div>
                                  <button
                                    className="p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={e => {
                                      e.preventDefault();
                                      // Remove link function
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
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-between items-center mt-4">
                      <div className="flex space-x-2">
                        <button
                          className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors duration-200 hover:cursor-pointer"
                          onClick={() => {
                            /* Add function to manage links */
                            setSelectedCategoryName(category.name);
                            setActiveTab("links");
                            // setSelectedCategoryId(category.id);
                          }}
                        >
                          <Link size={14} />
                          <span>Manage Links</span>
                        </button>
                      </div>
                      {categoriesStatus.find(status => status.categoryId === category.id)?.isFetchingArticles ? (
                        categoriesStatus.find(status => status.categoryId === category.id)?.isFetchedAllArticles ? (
                          <span className="text-sm text-gray-600">Re-fetching...</span>
                        ) : (
                          <RefreshCw size={14} />
                        )
                      ) : (
                        <button
                          className={`bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2 shadow-sm hover:shadow ${
                            category.isFetchingNewArticles ? "opacity-50 hover:cursor-wait" : "hover:cursor-pointer" // disable the button if isFetchingNewArticles is true
                          } 
                        `}
                          disabled={category.isFetchingNewArticles}
                          onClick={async () => {
                            // Set isFetchingNewArticles to true for this category
                            setCategories(
                              categories.map(cat =>
                                cat.id === category.id ? { ...cat, isFetchingNewArticles: true } : cat
                              )
                            );

                            // Also set this as the currently fetching category
                            setCategoriesFetching(category.id);

                            // get custom links from category
                            const customLinks = category.links.map(link => link.url.trim());

                            console.log("Custom Links:", customLinks);
                            console.log("_------------------------_");
                            await fetchNewsForCategory(category.id, customLinks, categories);

                            // Reset the categoriesFetching state when done
                            setCategoriesFetching(null);
                          }}
                        >
                          {category.isFetchingNewArticles ? (
                            <Loader
                              size={14}
                              // add loading animation
                              className="animate-spin text-white"
                            />
                          ) : (
                            <RefreshCw size={14} />
                          )}
                          <span key={category.id} ref={refFetchNews}>
                            {category.isFetchingNewArticles ? "Fetching" : "Fetch News"}
                          </span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Fixed bottom section for "Fetch All News" button */}
        <div className="absolute bottom-0 left-0 w-1/3 p-4 bg-white border-t border-gray-200">
          <button
            className={`w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition shadow-md hover:cursor-pointer flex items-center justify-center gap-1
              ${isFetchingAllNewsByButton ? "opacity-50 hover:cursor-wait" : ""}
              `}
            onClick={() => {
              fetchAllNews();
            }}
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
