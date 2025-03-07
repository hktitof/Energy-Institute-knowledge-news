// pages/index.js
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, X, Edit, ExternalLink, Plus } from "lucide-react";

export default function NewsAggregator() {
  // State for categories and search terms
  const [categories, setCategories] = useState([
    {
      id: 1,
      name: "Technology",
      searchTerms: ["AI", "Machine Learning", "Web Development"],
      showTable: false,
      articles: generateDummyArticles("Technology", 5),
    },
    {
      id: 2,
      name: "Business",
      searchTerms: ["Startups", "Investments", "Market Trends"],
      showTable: false,
      articles: generateDummyArticles("Business", 4),
    },
    {
      id: 3,
      name: "Health",
      searchTerms: ["Wellness", "Medical Research", "Diet"],
      showTable: false,
      articles: generateDummyArticles("Health", 6),
    },
  ]);

  // State for new category form
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSearchTerm, setNewSearchTerm] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  // State for summary prompt template
  const [summaryPrompt, setSummaryPrompt] = useState(
    "Summarise the following: #article_content# , DO NOT EXCEED #numbers# words"
  );
  const [editingPrompt, setEditingPrompt] = useState(false);

  // Function to generate dummy articles
  interface DummyArticle {
    id: string;
    title: string;
    content: string;
    summary: string;
    link: string;
    selected: boolean;
  }

  function generateDummyArticles(category: string, count: number): DummyArticle[] {
    const articles: DummyArticle[] = [];
    for (let i = 1; i <= count; i++) {
      articles.push({
        id: `${category.toLowerCase()}-${i}`,
        title: `${category} Article ${i}: Latest Developments in the Field`,
        content: `This is dummy content for ${category} article ${i}. It contains information about recent developments in the ${category.toLowerCase()} sector. Multiple paragraphs of text would normally be here describing the news event in detail.`,
        summary: "_",
        link: `https://example.com/${category.toLowerCase()}/article-${i}`,
        selected: false,
      });
    }
    return articles;
  }

  // Add a new category
  const addCategory = () => {
    if (newCategoryName.trim() === "") return;

    const newCategory = {
      id: categories.length + 1,
      name: newCategoryName,
      searchTerms: [],
      showTable: false,
      articles: [],
    };

    setCategories([...categories, newCategory]);
    setNewCategoryName("");
  };

  // Add a search term to a category
  const addSearchTerm = () => {
    if (newSearchTerm.trim() === "" || selectedCategoryId === null) return;

    setCategories(
      categories.map(category => {
        if (category.id === selectedCategoryId) {
          return {
            ...category,
            searchTerms: [...category.searchTerms, newSearchTerm],
          };
        }
        return category;
      })
    );

    setNewSearchTerm("");
  };

  // Remove a search term from a category
  interface Category {
    id: number;
    name: string;
    searchTerms: string[];
    showTable: boolean;
    articles: Article[];
  }

  interface Article {
    id: string;
    title: string;
    content: string;
    summary: string;
    link: string;
    selected: boolean;
  }

  const removeSearchTerm = (categoryId: number, termIndex: number): void => {
    setCategories(
      categories.map((category: Category) => {
        if (category.id === categoryId) {
          const newSearchTerms = [...category.searchTerms];
          newSearchTerms.splice(termIndex, 1);
          return {
            ...category,
            searchTerms: newSearchTerms,
          };
        }
        return category;
      })
    );
  };

  // Toggle category table visibility
  interface ToggleCategoryTable {
    (categoryId: number): void;
  }

  const toggleCategoryTable: ToggleCategoryTable = categoryId => {
    setCategories(
      categories.map((category: Category) => {
        if (category.id === categoryId) {
          return {
            ...category,
            showTable: !category.showTable,
          };
        }
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
    alert(`Fetching news for category ID ${categoryId}`);
    // In a real app, this would call an API and update the articles
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

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left sidebar with categories */}
      <div className="w-1/3 bg-white shadow-md flex flex-col h-full">
        <div className="p-4 border-b border-gray-200 bg-white">
          <h1 className="text-2xl font-bold text-gray-800">News Aggregator</h1>
        </div>

        {/* Categories container with scroll */}
        <div className="flex-grow overflow-y-auto pb-16">
          {categories.map(category => (
            <div key={category.id} className="border-b border-gray-100">
              <motion.div
                className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
                onClick={() => toggleCategoryTable(category.id)}
              >
                <h2 className="text-lg font-medium text-gray-700">{category.name}</h2>
                <div className="flex items-center">
                  <button
                    className="mr-2 p-1 rounded-md hover:bg-gray-200"
                    onClick={e => {
                      e.stopPropagation();
                      if (category.showTable) {
                        toggleCategoryTable(category.id);
                      }
                    }}
                  >
                    {category.showTable ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>
              </motion.div>

              <AnimatePresence>
                {category.searchTerms.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="px-4 pb-4 overflow-hidden"
                  >
                    <div className="flex flex-wrap gap-2 mb-4">
                      {category.searchTerms.map((term, index) => (
                        <div key={index} className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-md">
                          <span>{term}</span>
                          <button
                            className="ml-2 text-blue-600 hover:text-blue-800"
                            onClick={() => removeSearchTerm(category.id, index)}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end">
                      <button
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition hover:cursor-pointer"
                        onClick={() => fetchNewsForCategory(category.id)}
                      >
                        Fetch News
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
        <div className="p-6 bg-white shadow-sm ">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Add New Category & Search Terms</h2>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Category</label>
              <div className="flex">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  className="flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Category name"
                />
                <button
                  onClick={addCategory}
                  className="ml-2 bg-green-600 text-white p-2 rounded-md hover:bg-green-700 hover:cursor-pointer"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Add Search Term</label>
              <div className="flex">
                <select
                  value={selectedCategoryId || ""}
                  onChange={e => setSelectedCategoryId(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mr-2"
                >
                  <option value="">Select Category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newSearchTerm}
                  onChange={e => setNewSearchTerm(e.target.value)}
                  className="flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search term"
                />
                <button
                  onClick={addSearchTerm}
                  className="ml-2 bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 hover:cursor-pointer"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Prompt Template Section */}
        <div className="p-6 bg-white shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Summary Prompt Template</h2>
            <button
              onClick={() => setEditingPrompt(!editingPrompt)}
              className="text-blue-600 hover:text-blue-800 flex items-center hover:cursor-pointer"
            >
              <Edit size={18} className="mr-1" />
              {editingPrompt ? "Save" : "Edit"}
            </button>
          </div>

          {editingPrompt ? (
            <textarea
              value={summaryPrompt}
              onChange={e => setSummaryPrompt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
            />
          ) : (
            <div className="p-3 bg-gray-50 rounded-md text-gray-700 border border-gray-200">{summaryPrompt}</div>
          )}
          <p className="mt-2 text-sm text-gray-500">
            Use <code>#article_content#</code> to insert article content and <code>#numbers#</code> for word count.
          </p>
        </div>

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
