import React, { useState, useEffect } from "react";
import { ExternalLink, Edit, Save, Copy, Eye, AlertCircle } from "lucide-react";
import { Category, Article } from "@/utils/utils";

// Define types for the component props and data structure
interface ToggleArticleSelectionParams {
  categoryId: number;
  articleId: string;
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

  const refCopy = React.useRef<HTMLButtonElement>(null);

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
  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    // access refCopy and add UI changes, for one second
    if (refCopy.current) {
      refCopy.current.style.opacity = "1";
      setTimeout(() => {
        if (refCopy.current) {
          refCopy.current.style.opacity = "0";
        }
      });
    }
  };

  // Update handlePreview function
  const handlePreview = async (article: Article) => {
    setPreviewArticle(article);
    setIsLoading(true);
    setPreviewError(false);
    setPreviewHtml(null);
    setPreviewScreenshot(null);
    setUseScreenshot(false);

    try {
      // Try the advanced puppeteer-based API first
      const response = await fetch(`/api/preview-advanced?url=${encodeURIComponent(article.link)}`);

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setPreviewHtml(data.html);

      // Store the screenshot for fallback
      if (data.screenshot) {
        setPreviewScreenshot(data.screenshot);
      }
    } catch (error) {
      console.error("Failed to load preview:", error);

      // If we have a screenshot, show it instead of error
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
  const handleClosePreview = () => {
    resetPreviewStates();
  };

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
                  onChange={() =>
                    toggleArticleSelection({
                      categoryId: category.id,
                      articleId: article.id,
                    })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
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
                <div className="flex space-x-2">
                  {editingArticle === article.id ? (
                    <button
                      onClick={() => handleSaveEdit(category.id, article.id)}
                      className="text-green-600 hover:text-green-900 flex items-center hover:cursor-pointer"
                    >
                      <Save size={16} className="mr-1" />
                      Save
                    </button>
                  ) : (
                    <button
                      onClick={() => handleEditClick(article)}
                      className="text-gray-600 hover:text-gray-900 flex items-center hover:cursor-pointer"
                    >
                      <Edit size={16} className="mr-1" />
                      Edit
                    </button>
                  )}
                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-900 flex items-center hover:cursor-pointer"
                  >
                    <ExternalLink size={16} className="mr-1" />
                    Link
                  </a>
                  <button
                    ref={refCopy}
                    onClick={() => handleCopyLink(article.link)}
                    className="text-purple-600 hover:text-purple-900 flex items-center hover:cursor-pointer"
                  >
                    <Copy size={16} className="mr-1" />
                    Copy
                  </button>
                  <button
                    onClick={() => handlePreview(article)}
                    className="text-indigo-600 hover:text-indigo-900 flex items-center hover:cursor-pointer"
                  >
                    <Eye size={16} className="mr-1" />
                    Preview
                  </button>
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
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center px-6 py-8">
          <div className="fixed inset-0 bg-black opacity-50" onClick={handleClosePreview}></div>
          <div className="relative bg-white rounded-lg shadow-xl w-full h-full flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-start">
              <div className="space-y-2 flex-1">
                <h2 className="text-xl font-bold text-gray-900">{previewArticle.title}</h2>
                <p className="text-sm text-gray-600">{previewArticle.summary}</p>
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
                        } catch (e) {
                          return previewArticle.link;
                        }
                      })()}
                    </a>
                  </div>
                )}
              </div>
              <button onClick={handleClosePreview} className="text-gray-400 hover:text-gray-500 focus:outline-none">
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
              {/* // Add this to your modal body */}
              {useScreenshot && previewScreenshot && (
                <div className="w-full h-full flex flex-col items-center justify-start overflow-auto p-4">
                  <div className="bg-gray-100 p-2 mb-4 w-full rounded-md text-sm text-gray-700">
                    <div className="flex items-center mb-2">
                      <AlertCircle size={16} className="text-yellow-500 mr-2" />
                      <span className="font-medium">Page rendered as image</span>
                    </div>
                    <p>Interactive content couldn&apos;t be displayed safely. Showing a screenshot instead.</p>
                  </div>
                  <img
                    src={previewScreenshot}
                    alt={`Screenshot of ${previewArticle?.title || "article"}`}
                    className="max-w-full border border-gray-200 rounded shadow-sm"
                  />
                </div>
              )}
              {/* The iframe that will be populated with content */}
              <iframe
                id="preview-iframe"
                title={previewArticle.title || "Article Preview"}
                className="w-full h-full border-0"
                sandbox="allow-same-origin allow-scripts"
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
