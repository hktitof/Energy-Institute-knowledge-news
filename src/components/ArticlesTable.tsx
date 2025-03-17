import React, { useState, useEffect, useCallback } from "react";
import { ExternalLink, Edit, Save, Copy, Eye, Check, X } from "lucide-react";
import { Category, Article } from "@/utils/utils";
import Image from "next/image";
import { AlertCircle } from "lucide-react";

// Define types for the component props and data structure
interface ToggleArticleSelectionParams {
  categoryId: number;
  articleId: string;
  isShiftKey?: boolean;
}

interface ArticlesTableProps {
  category: Category;
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  categories: Category[];
}

const ArticlesTable: React.FC<ArticlesTableProps> = ({ categories, category, setCategories }) => {
  // State for editing mode and temporary edit values
  const [editingArticle, setEditingArticle] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSummary, setEditSummary] = useState("");

  // State for preview modal
  const [previewArticle, setPreviewArticle] = useState<Article | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewScreenshot, setPreviewScreenshot] = useState<string | null>(null);
  const [useScreenshot, setUseScreenshot] = useState(false);

  const [copiedArticleId, setCopiedArticleId] = useState<string | null>(null);
  
  // Add state for tracking last checked item (for shift+click functionality)
  const [lastCheckedId, setLastCheckedId] = useState<string | null>(null);

  // Reset preview states when closing the modal
  const resetPreviewStates = () => {
    setPreviewArticle(null);
    setPreviewError(false);
    setPreviewHtml(null);
    setIsLoading(false);
  };

  // Function to handle enabling edit mode
  const handleEditClick = (article: Article) => {
    setEditingArticle(article.id);
    setEditTitle(article.title || "");
    setEditSummary(article.summary || "");
  };

  // Toggle article selection
  const toggleArticleSelection = ({ categoryId, articleId, isShiftKey = false }: ToggleArticleSelectionParams): void => {
    // Handle shift+click for multiple selection
    if (isShiftKey && lastCheckedId && lastCheckedId !== articleId) {
      const currentArticles = [...category.articles];
      const currentIndex = currentArticles.findIndex(article => article.id === articleId);
      const lastCheckedIndex = currentArticles.findIndex(article => article.id === lastCheckedId);
      
      // Determine start and end index for the range
      const startIndex = Math.min(currentIndex, lastCheckedIndex);
      const endIndex = Math.max(currentIndex, lastCheckedIndex);
      
      // Get the target state from the current clicked item (to make all items in range match this state)
      const targetState = !currentArticles[currentIndex].selected;
      
      // Update categories with the range selection
      setCategories(
        categories.map((cat: Category) => {
          if (cat.id === categoryId) {
            return {
              ...cat,
              articles: cat.articles.map((article: Article, index: number) => {
                // If article is in the range, set it to the target state
                if (index >= startIndex && index <= endIndex) {
                  return {
                    ...article,
                    selected: targetState,
                  };
                }
                return article;
              }),
            };
          }
          return cat;
        })
      );
    } else {
      // Regular single item toggle
      setCategories(
        categories.map((cat: Category) => {
          if (cat.id === categoryId) {
            return {
              ...cat,
              articles: cat.articles.map((article: Article) => {
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
          return cat;
        })
      );
    }
    
    // Update last checked id for next shift+click operation
    setLastCheckedId(articleId);
  };

  // Function to save edited content
  const handleSaveEdit = (categoryId: number, articleId: string) => {
    setCategories(
      categories.map((cat: Category) => {
        if (cat.id === categoryId) {
          return {
            ...cat,
            articles: cat.articles.map((article: Article) => {
              if (article.id === articleId) {
                return {
                  ...article,
                  title: editTitle,
                  summary: editSummary,
                };
              }
              return article;
            }),
          };
        }
        return cat;
      })
    );
    setEditingArticle(null);
  };

  // Function to copy article link to clipboard
  const handleCopyLink = (articleId: string, link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedArticleId(articleId);

    // Reset after 2 seconds
    setTimeout(() => {
      setCopiedArticleId(null);
    }, 2000);
  };

  // Update the handlePreview function in your ArticlesTable component
  const handlePreview = async (article: Article) => {
    setPreviewArticle(article);
    setIsLoading(true);
    setPreviewError(false);
    setPreviewHtml(null);
    setPreviewScreenshot(null);
    setUseScreenshot(false);

    try {
      console.log(`Fetching preview for: ${article.link}`);

      // Use our new optimized endpoint
      const response = await fetch(`/api/preview-optimized?url=${encodeURIComponent(article.link)}`, {
        credentials: "include",
      });

      console.log(`Response status: ${response.status}`);

      const data = await response.json();
      console.log("Preview data:", data);

      if (data.error) {
        console.error("Preview API returned error:", data.error);
        throw new Error(data.error);
      }

      if (data.html) {
        setPreviewHtml(data.html);
        console.log(`Preview rendered using ${data.method || "unknown"} method`);
      } else {
        console.error("No HTML content received");
        throw new Error("No HTML content received");
      }

      if (data.screenshot) {
        setPreviewScreenshot(data.screenshot);
      }
    } catch (error) {
      console.error("Failed to load preview:", error);

      // Check if we already have a screenshot from earlier in the process
      if (previewScreenshot) {
        setUseScreenshot(true);
      } else {
        setPreviewError(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Function to close preview modal
  const handleClosePreview = useCallback(() => {
    resetPreviewStates();
  }, []);

  // add on escape key listener to close modal when pressing escape and it will perform handleClosePreview function, make sure to remove the listener when the component unmounts only when preview is open
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        console.log("Escape key pressed, closed Preview Modal");
        handleClosePreview();
      }
    };

    if (previewArticle) {
      document.addEventListener("keydown", handleEscapeKey);
    }

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [handleClosePreview, previewArticle]);

  // Create the preview iframe once we have HTML content
  useEffect(() => {
    if (previewHtml && !previewError) {
      const iframe = document.getElementById("preview-iframe") as HTMLIFrameElement;
      if (iframe) {
        // Create an iframe with the fetched HTML content
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
          doc.open();
          doc.write(previewHtml);
          doc.close();
        }
      }
    }
  }, [previewHtml, previewError]);

  // Handle checkbox change with shift key detection
  const handleCheckboxChange = (categoryId: number, articleId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    toggleArticleSelection({
      categoryId,
      articleId,
      isShiftKey: event.nativeEvent instanceof MouseEvent && event.nativeEvent.shiftKey
    });
  };

  return (
    <>
      <tbody className="bg-white divide-y divide-gray-200">
        {category.articles && category.articles.length > 0 ? (
          // Existing articles rendering
          category.articles.map(article => (
            <tr key={article.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={article.selected || false}
                  onChange={(e) => handleCheckboxChange(category.id, article.id, e)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </td>

              <td className="text-center py-4">
                <div
                  className={`text-sm font-medium ${article.title ? "" : "text-center"} ${
                    article.title?.includes("Access Denied") ||
                    article.title?.includes("Fetch Error") ||
                    article.title?.includes("Error")
                      ? "text-red-600 font-bold"
                      : "text-gray-900"
                  }`}
                >
                  {Number(article.id) + 1}
                </div>
              </td>

              <td className="px-6 py-4">
                {editingArticle === article.id ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <div
                    className={`text-sm font-medium ${article.title ? "" : "text-center"} ${
                      article.title?.includes("Access Denied") ||
                      article.title?.includes("Fetch Error") ||
                      article.title?.includes("Error")
                        ? "text-red-600 font-bold"
                        : "text-gray-900"
                    }`}
                  >
                    {article.title || "---------------------------"}
                  </div>
                )}
              </td>
              <td className="px-6 py-4">
                {editingArticle === article.id ? (
                  <textarea
                    value={editSummary}
                    onChange={e => setEditSummary(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                  />
                ) : (
                  <div
                    className={`text-sm font-medium ${article.title ? "" : "text-center"} ${
                      article.title?.includes("Access Denied") ||
                      article.title?.includes("Fetch Error") ||
                      article.title?.includes("Error")
                        ? "text-red-600 font-bold"
                        : "text-gray-900"
                    }`}
                  >
                    {article.summary || "---------------------------"}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex justify-end gap-2">
                  {editingArticle === article.id ? (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleSaveEdit(category.id, article.id)}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 hover:cursor-pointer"
                      >
                        <Save size={14} className="mr-1" />
                        Save
                      </button>
                      <button
                        onClick={() => setEditingArticle(null)}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 hover:cursor-pointer"
                      >
                        <X size={14} className="mr-1" />
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEditClick(article)}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 hover:cursor-pointer"
                    >
                      <Edit size={14} className="mr-1" />
                      Edit
                    </button>
                  )}

                  <div className="flex border-l pl-2 ml-1">
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handlePreview(article)}
                        className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors hover:cursor-pointer"
                        title="Preview"
                      >
                        <Eye size={16} />
                      </button>

                      <a
                        href={article.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                        title="Open link"
                      >
                        <ExternalLink size={16} />
                      </a>

                      <button
                        onClick={() => handleCopyLink(article.id, article.link)}
                        className={`p-1.5 rounded-full transition-colors ${
                          copiedArticleId === article.id
                            ? "text-green-600 bg-green-50"
                            : "text-gray-600 hover:text-purple-600 hover:bg-purple-50 hover:cursor-pointer"
                        }`}
                        title={copiedArticleId === article.id ? "Copied!" : "Copy link"}
                      >
                        {copiedArticleId === article.id ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          ))
        ) : (
          // Modern empty state
          <tr>
            <td colSpan={4} className="px-6 py-16 text-center">
              <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                <div className="w-24 h-24 mb-6 bg-blue-50 rounded-full flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12 text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No articles available</h3>
                <p className="text-sm text-gray-500 mb-6 text-center">
                  There are currently no articles in this category. New content will appear here once available.
                </p>
                <button
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onClick={() => {}}
                >
                  Try to fetch news
                </button>
              </div>
            </td>
          </tr>
        )}
      </tbody>

      {/* Preview Modal */}
      {previewArticle && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center px-3 py-2">
          <div className="fixed inset-0 bg-black opacity-50" onClick={handleClosePreview}></div>
          <div className="relative bg-white rounded-lg shadow-xl w-full h-full flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-2 border-b border-gray-200 flex justify-between items-start">
              <div className="space-y-2 flex-1">
                <h2 className="text-lg font-bold text-gray-900">{previewArticle.title}</h2>
                <p className="text-xs text-gray-600">{previewArticle.summary}</p>
                {/* Display the source domain */}
                {previewArticle.link && (
                  <div className="flex items-center text-xs text-gray-500">
                    <span className="inline-block mr-1">Source:</span>
                    <a
                      href={previewArticle.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline text-blue-600"
                    >
                      {(() => {
                        try {
                          return new URL(previewArticle.link).hostname;
                        } catch (e: unknown) {
                          console.error("Error parsing URL:", e);
                          return previewArticle.link;
                        }
                      })()}
                    </a>
                  </div>
                )}
              </div>
              <button
                onClick={handleClosePreview}
                className="text-gray-400 hover:text-gray-500 focus:outline-none hover:cursor-pointer"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body with iframe or loading/error states */}
            <div className="flex-1 p-0 overflow-hidden relative">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading preview...</p>
                  </div>
                </div>
              )}
              {previewError && (
                <div className="absolute inset-0 flex items-center justify-center bg-white">
                  <div className="text-center p-6 max-w-lg">
                    <div className="w-16 h-16 mx-auto mb-4 bg-red-50 rounded-full flex items-center justify-center">
                      <AlertCircle size={24} className="text-red-500" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load preview</h3>
                    <p className="mb-6 text-gray-600">
                      We couldn&apos;t load the content from this website. This might be due to security restrictions or
                      the website being temporarily unavailable.
                    </p>
                    <a
                      href={previewArticle.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Open in New Tab
                    </a>
                  </div>
                </div>
              )}
              {useScreenshot && previewScreenshot && (
                <div className="w-full h-full flex flex-col items-center justify-start overflow-auto p-4">
                  <div className="bg-gray-100 p-2 mb-4 w-full rounded-md text-sm text-gray-700">
                    <div className="flex items-center mb-2">
                      <AlertCircle size={16} className="text-yellow-500 mr-2" />
                      <span className="font-medium">Page rendered as image</span>
                    </div>
                    <p>Interactive content couldn&apos;t be displayed safely. Showing a screenshot instead.</p>
                  </div>

                  <Image
                    src={previewScreenshot}
                    alt={`Screenshot of ${previewArticle?.title || "article"}`}
                    className="max-w-full border border-gray-200 rounded shadow-sm"
                    width={100}
                    height={300}
                    loading="lazy"
                  />
                </div>
              )}
              {/* The iframe that will be populated with content */}
              <iframe
                id="preview-iframe"
                title={previewArticle.title || "Article Preview"}
                className="w-full h-full border-0"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-popups-to-escape-sandbox"
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 flex justify-between">
              <a
                href={previewArticle.link}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
              >
                <ExternalLink size={16} className="mr-2" />
                Open in New Tab
              </a>
              <button
                onClick={handleClosePreview}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ArticlesTable;
