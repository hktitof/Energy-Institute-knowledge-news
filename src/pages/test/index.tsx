// pages/index.js
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, X, ExternalLink, Plus } from "lucide-react";
import axios from "axios";
import { useEffect } from "react";

// import fetchCategories from utils.ts
import { fetchCategories } from "../../utils/utils";

// import types Category and Article from utils.ts
import { Category, Article } from "../../utils/utils";
// import loader icon for loading states
import { Loader } from "lucide-react";
import { Trash, Trash2, RefreshCw, Link, Globe } from "lucide-react";
import { toast } from "react-toastify";
import { promises as fs } from "fs";
import CategoryManager from "@/components/CategoryManager";
import LinkList from "@/components/LinkList";

export default function NewsAggregator() {
  // Declare a state variable called categories and set it to an empty array of Category objects
  const [categories, setCategories] = useState<Category[]>([]);

  // State for new category form
  const [newCategoryName, setNewCategoryName] = useState("");
  // const [newSearchTerm, setNewSearchTerm] = useState("");
  // const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  // this will be used to track if the user is adding a new category and show a loading spinner

  // // Fetch categories and search terms from API
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  useEffect(() => {
    // call the fetchCategories function when the component mounts
    fetchCategories(setCategories);
  }, []);

  const [loadingSearchTermId, setLoadingSearchTermId] = useState<number | null>(null); // Track loading state

  const removeSearchTerm = async (categoryId: number, termIndex: number) => {
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) return;

    const searchTerm = category.searchTerms[termIndex];
    if (!searchTerm) return;

    setLoadingSearchTermId(termIndex); // Show loading indicator

    // Optimistic UI update: Remove the term locally first
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
      // API Call to delete the term
      await axios.delete("/api/searchTerms/delete", {
        data: { searchTerm }, // Ensure your API expects this in the body
      });

      // Fetch updated categories from the API to sync with the database
      fetchCategories(setCategories);
    } catch (error) {
      console.error("Error deleting search term:", error);

      // Revert UI on error
      setCategories(categories);
    } finally {
      setLoadingSearchTermId(null); // Remove loading state
    }
  };

  // Toggle category table visibility
  interface ToggleCategoryTable {
    (categoryId: number): void;
  }

  // Function to toggle the category table
  const toggleCategoryTable: ToggleCategoryTable = categoryId => {
    // Map through the categories array
    setCategories(
      categories.map((category: Category) => {
        // If the category id matches the categoryId parameter
        if (category.id === categoryId) {
          // Return a new category object with the showTable property toggled
          return {
            ...category,
            showTable: !category.showTable,
          };
        }
        // Otherwise, return the original category object
        return category;
      })
    );
  };

  // Toggle article selection
  interface ToggleArticleSelectionParams {
    categoryId: number;
    articleId: string;
  }

  const toggleArticleSelection = ({ categoryId, articleId }: ToggleArticleSelectionParams): void => {
    setCategories(
      categories.map((category: Category) => {
        if (category.id === categoryId) {
          return {
            ...category,
            articles: category.articles.map((article: Article) => {
              if (article.id === articleId) {
                return {
                  ...article,
                  selected: !article.selected,
                };
              }
              return article;
            }),
          };
        }
        return category;
      })
    );
  };

  // Function to fetch news for a category (would be replaced with actual API call)
  interface FetchNewsForCategory {
    (categoryId: number): void;
  }

  const fetchNewsForCategory: FetchNewsForCategory = categoryId => {
    
  };

  // Function to fetch all news
  const fetchAllNews = () => {
    alert("Fetching news for all categories");
    // In a real app, this would call an API for all categories
  };

  // Function to summarize selected articles
  interface SummarizeSelectedArticles {
    (categoryId: number): void;
  }

  interface CategoryForSummary {
    id: number;
    name: string;
    articles: Array<{ selected: boolean }>;
  }

  const summarizeSelectedArticles: SummarizeSelectedArticles = categoryId => {
    const category = categories.find((c: CategoryForSummary) => c.id === categoryId);
    if (!category) return;

    const selectedArticleCount = category.articles.filter(a => a.selected).length;
    alert(`Summarizing ${selectedArticleCount} articles from category "${category.name}"`);
    // In a real app, this would call an API to summarize the articles
  };

  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);

  /**
   * Deletes a category and handles loading state using axios
   * @param categoryId The ID of the category to delete
   * @param e The click event
   */
  const handleDeleteCategory = async (categoryId: string, e: React.MouseEvent) => {
    // Prevent event bubbling to parent elements
    e.stopPropagation();

    // Set loading state
    setDeletingCategoryId(categoryId);

    try {
      await axios.delete("/api/categories/delete", {
        data: { categoryId },
      });

      // Handle successful deletion - update your state to remove the category
      setCategories(prevCategories => prevCategories.filter(category => category.id !== Number(categoryId)));

      // You might want to show a success toast/notification here
      toast.success("Category deleted successfully");
    } catch (error) {
      console.error("Error deleting category:", error);

      // Show error notification with appropriate message
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error || "Failed to delete category";
        toast.error(errorMessage);
      } else {
        toast.error("Failed to delete category");
      }
    } finally {
      // Clear loading state
      setDeletingCategoryId(null);
    }
  };

  // console logs

  // print categories
  console.log("categories :", categories);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left sidebar with categories */}
      <div className="w-1/3 bg-white shadow-md flex flex-col h-full">
        <div className="p-4 border-b border-gray-200 bg-white">
          <h1 className="text-2xl font-bold text-gray-800">News Aggregator</h1>
        </div>

        {/* Categories container with scroll */}
        <div className="flex-grow overflow-y-auto pb-20 pl-3 pr-3 pt-3">
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
                    href={`https://news.google.com/search?q=${encodeURIComponent(category.searchTerms.join(" OR "))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full text-gray-500 hover:bg-blue-50 hover:text-blue-500 transition-colors duration-200"
                    onClick={e => e.stopPropagation()}
                    title="Open in Google News"
                  >
                    <ExternalLink size={18} />
                  </a>
                  <button
                    className="p-2 rounded-full text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors duration-200 hover:cursor-pointer"
                    onClick={e => handleDeleteCategory(category.id.toString(), e)}
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
                {category.showTable && (
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
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-sm font-medium text-gray-700">Search Terms</h3>
                          <button
                            className="text-xs text-gray-500 hover:text-gray-700 flex items-center space-x-1"
                            onClick={() => {
                              /* Add function to clear all search terms */
                            }}
                          >
                            <Trash size={12} />
                            <span>Clear all</span>
                          </button>
                        </div>
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
                          <div className="flex items-center space-x-2">
                            <button
                              className="text-xs text-gray-500 hover:text-blue-600 flex items-center hover:cursor-pointer"
                              onClick={() => {
                                /* Function to add new link */
                                setSelectedCategoryName(category.name);
                                setActiveTab("links");
                                setSelectedCategoryId(category.id);
                              }}
                            >
                              <Plus size={14} className="mr-1 " />
                              Add link
                            </button>
                          </div>
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
                            setSelectedCategoryId(category.id);
                          }}
                        >
                          <Link size={14} />
                          <span>Manage Links</span>
                        </button>
                      </div>
                      <button
                        className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2 shadow-sm hover:shadow"
                        onClick={async () => fetchNewsForCategory(category.id)}
                      >
                        <RefreshCw size={14} />
                        <span>Fetch News</span>
                      </button>
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
            className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition shadow-md hover:cursor-pointer"
            onClick={fetchAllNews}
          >
            Fetch All News
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
          selectedCategoryId={selectedCategoryId ?? 0}
          categories={categories}
        />

        {/* Articles Tables */}
        {categories.map(
          category =>
            category.showTable && (
              <div key={`table-${category.id}`} className="p-6 bg-white shadow-sm mb-1">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">{category.name} Articles</h2>
                  <button
                    onClick={() => summarizeSelectedArticles(category.id)}
                    className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition"
                  >
                    Summarize Selected
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Select
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Title
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Content
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Summary
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Link
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {category.articles.map(article => (
                        <tr key={article.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={article.selected || false}
                              onChange={() =>
                                toggleArticleSelection({ categoryId: category.id, articleId: article.id })
                              }
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{article.title}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500 max-w-xs truncate">{article.content}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500">{article.summary}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <a
                              href={article.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-900 flex items-center"
                            >
                              <ExternalLink size={16} className="mr-1" />
                              Link
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
        )}
      </div>
    </div>
  );
}
