import React, { useState } from "react";
import { Category } from "@/utils/utils";
import ArticlesTable from "./ArticlesTable";
import { Loader2, Settings } from "lucide-react";

export default function CategoryComponent({
  category,
  categories,
  setCategories,
}: {
  category: Category;
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
}) {
  const [maxWords, setMaxWords] = useState(category.summaryMaxWords || 50);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState(
    "Create a single, concise summary of these {categoryName} articles in exactly {maxWords} words. Focus on the most important points. Return ONLY the summary text without any formatting or prefixes."
  );

  // Calculate how many articles are selected
  const selectedArticlesCount = category.articles.filter(a => a.selected).length;
  const totalArticlesCount = category.articles.length;

  // Handle selecting all articles
  const handleSelectAll = () => {
    const allSelected = category.articles.every(article => article.selected);

    setCategories(prevCategories =>
      prevCategories.map(c => {
        if (c.id === category.id) {
          return {
            ...c,
            articles: c.articles.map(article => ({
              ...article,
              selected: !allSelected,
            })),
          };
        }
        return c;
      })
    );
  };

  // Save custom prompt to category
  const saveCustomPrompt = () => {
    setCategories(prevCategories =>
      prevCategories.map(c => {
        if (c.id === category.id) {
          return {
            ...c,
            customPrompt,
          };
        }
        return c;
      })
    );
    setIsPromptModalOpen(false);
  };

  // Reset prompt to default
  const resetToDefaultPrompt = () => {
    const defaultPrompt =
      "Create a single, concise summary of these {categoryName} articles in exactly {maxWords} words. Focus on the most important points. Return ONLY the summary text without any formatting or prefixes.";
    setCustomPrompt(defaultPrompt);
  };

  // Handle summarization
  const summarizeSelectedArticles = async () => {
    // Do nothing if no articles are selected
    if (selectedArticlesCount === 0) {
      console.log("No articles selected");
      return;
    }

    console.log("Starting summarization process...");

    // Update state to show loading
    setCategories(prevCategories =>
      prevCategories.map(c => {
        if (c.id === category.id) {
          return {
            ...c,
            isSummaryFetching: true,
          };
        }
        return c;
      })
    );

    try {
      // Get selected articles
      const selectedArticles = category.articles.filter(article => article.selected);
      console.log("Selected articles:", selectedArticles);

      // Format articles for API
      const articlesForApi = selectedArticles.map(article => ({
        title: article.title || "",
        summary: article.summary || "",
      }));

      // Get the prompt (either custom or default)
      const promptTemplate =
        "Create a single, concise summary of these {categoryName} articles in exactly {maxWords} words. Focus on the most important points. Return ONLY the summary text without any formatting or prefixes.";

      console.log("API request payload:", {
        articles: articlesForApi,
        maxWords: maxWords,
        categoryName: category.name,
        customPrompt: promptTemplate,
      });

      // Make API request
      const response = await fetch("/api/summarize-articles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          articles: articlesForApi,
          maxWords: maxWords,
          categoryName: category.name,
          customPrompt: promptTemplate,
        }),
      });

      console.log("API response status:", response.status);

      // Get response as text first for debugging
      const responseText = await response.text();
      console.log("API response text:", responseText);

      // Parse the response if possible
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Error parsing JSON response:", e);
        throw new Error("Invalid response format from API");
      }

      if (!response.ok) {
        console.error("API error response:", data);
        throw new Error(data.error || "Failed to summarize articles");
      }

      console.log("API success response:", data);

      // Update the category with the summary
      setCategories(prevCategories =>
        prevCategories.map(c => {
          if (c.id === category.id) {
            return {
              ...c,
              summary: data.summary,
              isSummaryFetching: false,
              summaryMaxWords: maxWords,
            };
          }
          return c;
        })
      );
    } catch (error) {
      console.error("Error summarizing articles:", error);

      // Update state to remove loading
      setCategories(prevCategories =>
        prevCategories.map(c => {
          if (c.id === category.id) {
            return {
              ...c,
              summary: "",
              isSummaryFetching: false,
            };
          }
          return c;
        })
      );

      alert(`Failed to summarize articles: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  // Reset summary and selections
  const resetSummary = () => {
    setCategories(prevCategories =>
      prevCategories.map(c => {
        if (c.id === category.id) {
          return {
            ...c,
            summary: "",
            articles: c.articles.map(article => ({
              ...article,
              selected: false,
            })),
          };
        }
        return c;
      })
    );
  };

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-4">
      {/* Category Header */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex flex-col space-y-2">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="mr-2 text-gray-500 hover:text-gray-700 transition"
              >
                {isExpanded ? "▼" : "►"}
              </button>
              {category.name} Articles
              <span className="ml-3 text-sm font-normal text-gray-500">
                ({selectedArticlesCount} of {totalArticlesCount} selected)
              </span>
            </h2>
            <div className="flex items-center space-x-3">
              <div className="flex items-center">
                <label htmlFor={`maxWords-${category.id}`} className="text-sm text-gray-600 mr-2">
                  Max Words:
                </label>
                <input
                  id={`maxWords-${category.id}`}
                  type="number"
                  min="10"
                  max="300"
                  value={maxWords}
                  onChange={e => setMaxWords(Math.max(10, Math.min(300, parseInt(e.target.value) || 50)))}
                  className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                />
              </div>
              <button
                onClick={() => setIsPromptModalOpen(true)}
                title="Customize summary prompt"
                className="flex items-center justify-center w-8 h-8 text-gray-600 hover:bg-gray-100 rounded-full transition hover:cursor-pointer"
              >
                <Settings size={16} />
              </button>
              <button
                onClick={resetSummary}
                disabled={!category.summary && selectedArticlesCount === 0}
                className="text-sm px-3 py-1 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
              >
                Reset
              </button>
              <button
                onClick={summarizeSelectedArticles}
                disabled={selectedArticlesCount === 0 || category.isSummaryFetching}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition disabled:opacity-70 disabled:cursor-not-allowed flex items-center hover:cursor-pointer"
              >
                {category.isSummaryFetching ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4 mr-2" />
                    Summarizing...
                  </>
                ) : (
                  "Summarize Selected"
                )}
              </button>
            </div>
          </div>

          {/* Summary Section - only show if there's a summary */}
          {category.summary && (
            <div className="mt-3 p-3 bg-purple-50 border border-purple-100 rounded-md">
              <h3 className="text-sm font-semibold text-purple-800 mb-1">Summary</h3>
              <p className="text-sm text-gray-700">{category.summary}</p>
            </div>
          )}
        </div>
      </div>

      {/* Articles Table Section */}
      {isExpanded && (
        <div className="p-4">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded cursor-pointer"
                        checked={category.articles.length > 0 && category.articles.every(article => article.selected)}
                        onChange={handleSelectAll}
                      />
                      <span className="ml-2">Select</span>
                    </div>
                  </th>
                  <th scope="col" className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Id
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
              <ArticlesTable categories={categories} category={category} setCategories={setCategories} />
            </table>
          </div>
        </div>
      )}

      {/* Custom Prompt Modal */}
      {isPromptModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white  rounded-lg shadow-xl w-full max-w-2xl max-h-screen overflow-hidden">
            <div className="p-4 bg-purple-100 border-b">
              <h3 className="text-lg font-medium text-purple-900">Customize Summary Prompt</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Customize how the AI generates your summary. You can use the following variables that will be replaced:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 mb-4 space-y-1">
                <li>
                  <code className="bg-gray-100 px-1 py-0.5 rounded">{"{categoryName}"}</code> - Will be replaced with
                  the category name
                </li>
                <li>
                  <code className="bg-gray-100 px-1 py-0.5 rounded">{"{maxWords}"}</code> - Will be replaced with your
                  max word count
                </li>
              </ul>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Prompt Template</label>
                <textarea
                  value={customPrompt}
                  onChange={e => setCustomPrompt(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 text-gray-700 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter your custom prompt template here..."
                ></textarea>
              </div>

              <div className="flex justify-between items-center">
                <button
                  onClick={resetToDefaultPrompt}
                  className="text-sm text-purple-600 hover:text-purple-800 hover:cursor-pointer"
                >
                  Reset to Default
                </button>
                <div className="space-x-3">
                  <button
                    onClick={() => setIsPromptModalOpen(false)}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 hover:cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveCustomPrompt}
                    className="px-4 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 hover:cursor-pointer"
                  >
                    Save Prompt
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
