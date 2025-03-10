import React, { useState } from "react";
import { ExternalLink, Edit, Save, Copy, Eye } from "lucide-react";
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

  // Function to handle enabling edit mode
  const handleEditClick = (article: Article) => {
    setEditingArticle(article.id);
    setEditTitle(article.title || "");
    setEditSummary(article.summary || "");
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
    // Could add a toast notification here
  };

  // Function to open preview modal
  const handlePreview = (article: Article) => {
    setPreviewArticle(article);
  };

  // Function to close preview modal
  const handleClosePreview = () => {
    setPreviewArticle(null);
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
                    onChange={(e) => setEditTitle(e.target.value)}
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
                    onChange={(e) => setEditSummary(e.target.value)}
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
                      className="text-green-600 hover:text-green-900 flex items-center"
                    >
                      <Save size={16} className="mr-1" />
                      Save
                    </button>
                  ) : (
                    <button
                      onClick={() => handleEditClick(article)}
                      className="text-gray-600 hover:text-gray-900 flex items-center"
                    >
                      <Edit size={16} className="mr-1" />
                      Edit
                    </button>
                  )}
                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-900 flex items-center"
                  >
                    <ExternalLink size={16} className="mr-1" />
                    Link
                  </a>
                  <button
                    onClick={() => handleCopyLink(article.link)}
                    className="text-purple-600 hover:text-purple-900 flex items-center"
                  >
                    <Copy size={16} className="mr-1" />
                    Copy
                  </button>
                  <button
                    onClick={() => handlePreview(article)}
                    className="text-indigo-600 hover:text-indigo-900 flex items-center"
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
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={handleClosePreview}></div>
          <div className="relative bg-white rounded-lg shadow-xl pl w-full max-h-screen flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-start">
              <div className="space-y-2 flex-1">
                <h2 className="text-xl font-bold text-gray-900">{previewArticle.title}</h2>
                <p className="text-sm text-gray-600">{previewArticle.summary}</p>
              </div>
              <button
                onClick={handleClosePreview}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Body with iframe */}
            <div className="flex-1 p-0 overflow-hidden">
              <iframe
                src={previewArticle.link}
                title={previewArticle.title || "Article Preview"}
                className="w-full h-full border-0"
                sandbox="allow-same-origin allow-scripts"
              />
            </div>
            
            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 flex justify-end">
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