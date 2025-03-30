import React, { useState, useEffect, useCallback } from "react";
import { ExternalLink, Edit, Save, Copy, Eye, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { Category, Article } from "@/utils/utils";
import Image from "next/image";
import { AlertCircle } from "lucide-react";

import {
  AlertTriangle, // Added for "NOT AN ARTICLE"
  XCircle, // Added for errors
} from "lucide-react";

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
  const [expandedSummaries, setExpandedSummaries] = useState<Record<string, boolean>>({});

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
  const toggleArticleSelection = ({
    categoryId,
    articleId,
    isShiftKey = false,
  }: ToggleArticleSelectionParams): void => {
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
      isShiftKey: event.nativeEvent instanceof MouseEvent && event.nativeEvent.shiftKey,
    });
  };

  // Helper function to determine the article state (optional but good practice)
  const getArticleState = (article: {
    title?: string | null;
    summary?: string | null;
  }): "normal" | "not_an_article" | "error" => {
    const titleLower = (article.title || "").toLowerCase();
    if (titleLower === "not an article") {
      return "not_an_article";
    }
    // Add more specific error checks if needed
    if (titleLower.includes("access denied") || titleLower.includes("fetch error") || titleLower === "error") {
      return "error";
    }
    return "normal";
  };

  // --- Inside your component where the table row is rendered ---

  // Assuming you have `article`, `index`, `category`, `editingArticle`, `editTitle`, `setEditTitle`,
  // `editSummary`, `setEditSummary`, `handleSaveEdit`, `setEditingArticle`, `handleEditClick`,
  // `handlePreview`, `handleCopyLink`, `copiedArticleId`, `handleCheckboxChange` defined

  // const articleState = getArticleState(article);
  // const isSpecialState = articleState === "not_an_article" || articleState === "error";

  const toggleSummaryExpansion = (articleId: string) => {
    setExpandedSummaries(prev => ({
      ...prev,
      [articleId]: !prev[articleId], // Toggle the boolean value
    }));
  };

  return (
    <>
      <tbody className="bg-white divide-y divide-gray-200">
        {category.articles && category.articles.length > 0 ? (
          // Existing articles rendering
          category.articles.map((article, index) => {
            const articleState = getArticleState(article);
            const isSpecialState = articleState === "not_an_article" || articleState === "error";
            return (
              <tr
                key={article.id}
                className={`
                border-b border-gray-200 transition-colors duration-150 ease-in-out
                ${isSpecialState ? "bg-gray-50" : "bg-white"}
                ${editingArticle === article.id ? "bg-blue-50/50" : ""}
                hover:bg-blue-50/30
                `}
              >
                {/* Checkbox */}
                <td className="px-4 py-3 align-top w-12">
                  <input
                    type="checkbox"
                    checked={article.selected || false}
                    onChange={e => handleCheckboxChange(category.id, article.id, e)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </td>

                {/* Index */}
                <td className="px-2 py-4 align-top w-12 text-center text-xs text-gray-400 font-medium">{index + 1}</td>

                {/* Title & Summary (or Special State Info) */}
                {articleState === "not_an_article" && (
                  <td colSpan={2} className="px-6 py-4 align-middle text-sm text-yellow-800 bg-yellow-50/70">
                    <div className="flex items-center gap-3">
                      <AlertTriangle size={18} className="text-yellow-500 flex-shrink-0" />
                      <div>
                        <p className="font-semibold">Content Not Suitable for Summary</p>
                        <p className="text-xs text-yellow-700">{article.summary}</p> {/* Show the standard message */}
                      </div>
                    </div>
                  </td>
                )}

                {articleState === "error" && (
                  <td colSpan={2} className="px-6 py-4 align-middle text-sm text-red-800 bg-red-50/70">
                    <div className="flex items-center gap-3">
                      <XCircle size={18} className="text-red-500 flex-shrink-0" />
                      <div>
                        <p className="font-semibold">Error Fetching/Processing</p>
                        <p className="text-xs text-red-700">
                          {article.title} {article.summary ? `- ${article.summary}` : ""}
                        </p>
                      </div>
                    </div>
                  </td>
                )}

                {articleState === "normal" && (
                  <>
                    {/* Title Column */}
                    <td className="px-6 py-4 align-top max-w-xs">
                      {" "}
                      {/* Added max-w-xs */}
                      {editingArticle === article.id ? (
                        <input
                          type="text"
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          aria-label="Edit Title"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-gray-800 break-words">
                          {" "}
                          {/* Changed font weight/color */}
                          {article.title || <span className="text-gray-400 italic">No Title Provided</span>}
                        </p>
                      )}
                    </td>

                    {/* Summary Column */}
                    <td className="px-6 py-4 align-top">
                      {editingArticle === article.id ? (
                        <textarea
                          value={editSummary}
                          onChange={e => setEditSummary(e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          rows={3}
                          aria-label="Edit Summary"
                        />
                      ) : (
                        // --- Start modification here ---
                        <div>
                          {" "}
                          {/* Wrap summary and button */}
                          <p
                            className={`text-sm text-gray-600 break-words ${
                              !expandedSummaries[article.id] ? "line-clamp-3" : "" // Apply line-clamp conditionally
                            }`}
                          >
                            {article.summary || <span className="text-gray-400 italic">No Summary Provided</span>}
                          </p>
                          {/* Show button only if there IS a summary */}
                          {article.summary && (
                            <button
                              onClick={() => toggleSummaryExpansion(article.id)}
                              className="mt-1 text-xs text-indigo-600 hover:text-indigo-800 flex items-center hover:cursor-pointer"
                            >
                              {expandedSummaries[article.id] ? (
                                <>
                                  Show less <ChevronUp size={14} className="ml-1" />
                                </>
                              ) : (
                                <>
                                  Show more <ChevronDown size={14} className="ml-1 hover:cursor-pointer" />
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </>
                )}

                {/* Actions Column */}
                <td className="px-4 py-3 align-top whitespace-nowrap text-right">
                  <div className="flex justify-end items-center space-x-2">
                    {editingArticle === article.id ? (
                      // Save/Cancel Buttons (while editing)
                      <>
                        <button
                          onClick={() => handleSaveEdit(category.id, article.id)}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                          title="Save Changes"
                        >
                          <Save size={14} className="mr-1" />
                          Save
                        </button>
                        <button
                          onClick={() => setEditingArticle(null)}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors"
                          title="Cancel Edit"
                        >
                          <X size={14} className="mr-1" />
                          Cancel
                        </button>
                      </>
                    ) : (
                      // Edit Button (when not editing)
                      <button
                        onClick={() => handleEditClick(article)}
                        disabled={isSpecialState} // Disable edit for special states
                        className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors
                      ${
                        isSpecialState
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:cursor-pointer"
                      }
                      `}
                        title={isSpecialState ? "Cannot edit this item" : "Edit Title & Summary"}
                      >
                        <Edit size={14} className="mr-1" />
                        Edit
                      </button>
                    )}

                    {/* Vertical Divider (Adjust logic if needed) */}
                    {editingArticle !== article.id && <div className="h-5 w-px bg-gray-200 mx-1"></div>}
                    {/* ^^ Show divider only when Edit button is present and we are NOT editing ^^ */}

                    {/* View/Link/Copy Buttons Section */}
                    <div className="flex items-center space-x-1">
                      {/* Preview Button (Now ALWAYS shown) */}
                      <button
                        onClick={() => handlePreview(article)}
                        className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-100 rounded-full transition-colors"
                        title="Preview" // Changed title slightly as it's not always a summary preview
                      >
                        <Eye size={16} />
                      </button>
                      {/* NO MORE CONDITIONAL WRAPPER HERE */}

                      {/* Link Button (Always show, uses article.link) */}
                      <a
                        href={article.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded-full transition-colors"
                        title="Open Original Link"
                      >
                        <ExternalLink size={16} />
                      </a>

                      {/* Copy Button (Always show, uses article.link) */}
                      <button
                        onClick={() => handleCopyLink(article.id, article.link)}
                        className={`p-1.5 rounded-full transition-colors ${
                          copiedArticleId === article.id
                            ? "text-green-600 bg-green-100"
                            : "text-gray-500 hover:text-purple-600 hover:bg-purple-100"
                        }`}
                        title={copiedArticleId === article.id ? "Link Copied!" : "Copy Link"}
                      >
                        {copiedArticleId === article.id ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            );
          })
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
            <div className="flex-1 overflow-hidden relative bg-gray-100">
              {" "}
              {/* Added bg for contrast */}
              {/* Loading Overlay */}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-20">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading preview...</p>
                  </div>
                </div>
              )}
              {/* Error Display */}
              {previewError &&
                !isLoading && ( // Show only if error and not loading
                  <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
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
                        href={previewArticle.link} // Use previewArticle here
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        Open in New Tab
                      </a>
                    </div>
                  </div>
                )}
              {/* Screenshot Display */}
              {useScreenshot &&
                previewScreenshot &&
                !isLoading &&
                !previewError && ( // Show only if screenshot mode, not loading, no primary error
                  <div className="absolute inset-0 flex flex-col items-center justify-start overflow-auto p-4 bg-white z-10">
                    <div className="bg-yellow-50 border border-yellow-200 p-2 mb-4 w-full rounded-md text-sm text-yellow-800">
                      <div className="flex items-center mb-1">
                        <AlertCircle size={16} className="text-yellow-600 mr-2 flex-shrink-0" />
                        <span className="font-medium">Page rendered as image</span>
                      </div>
                      <p className="text-xs">
                        Interactive content couldn&apos;t be displayed safely. Showing a screenshot instead.
                      </p>
                    </div>
                    {/* Ensure Image uses correct props for Next.js >= 13 */}
                    <Image
                      src={previewScreenshot} // Assumes this is a base64 data URL or external URL
                      alt={`Screenshot of ${previewArticle?.title || "article"}`}
                      className="max-w-full h-auto border border-gray-200 rounded shadow-sm" // Use h-auto
                      width={1200} // Provide a reasonable intrinsic width
                      height={800} // Provide a reasonable intrinsic height
                      style={{ objectFit: "contain" }} // Adjust object fit if needed
                      priority={false} // Don't prioritize loading screenshot usually
                      unoptimized={previewScreenshot.startsWith("data:")} // Important for base64
                    />
                  </div>
                )}
              {/* Iframe - always rendered but hidden if loading/error/screenshot */}
              <iframe
                id="preview-iframe"
                title={previewArticle?.title || "Article Preview"} // Use optional chaining
                className={`w-full h-full border-0 transition-opacity duration-300 ${
                  isLoading || previewError || useScreenshot ? "opacity-0" : "opacity-100" // Control visibility via opacity
                }`}
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-popups-to-escape-sandbox"
                // src="about:blank" // Optionally set initial src
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
