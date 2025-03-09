import React, { useState, useEffect } from "react";
import CategoryAdder from "./CategoryAdder";
import SearchTermAdder from "./SearchTermAdder";
import { fetchCategories } from "@/utils/utils";
import type { Category } from "@/utils/utils";
import { Edit, Plus, Trash2, Settings, ExternalLink, Link as LinkIcon, Type } from "lucide-react";
import { toast } from "react-toastify";
import LinkForm from "./LinkForm";
export default function CategoryManager({
  newCategoryName,
  setNewCategoryName,
  categories,
  setCategories,
  activeTab,
  setActiveTab,
  selectedCategoryName,
}: {
  newCategoryName: string;
  setNewCategoryName: (name: string) => void;
  categories: Category[];
  fetchCategories: (setCategories: React.Dispatch<React.SetStateAction<Category[]>>) => Promise<void>;
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  activeTab: string | null;
  setActiveTab: (tab: string | null) => void;
  selectedCategoryName: string;
}) {
  const [editingPrompt, setEditingPrompt] = useState(false);
  // this will be used to track if the user is adding a new category and show a loading spinner
  const [adding, setAdding] = useState(false);

  const [links, setLinks] = useState<{ id: string; title: string; url: string }[]>([]);

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  const [summaryPrompt, setSummaryPrompt] = useState(
    "Summarise the following: #article_content# , DO NOT EXCEED #numbers# words"
  );

  // set the selected category id when it's null and use the selectedCategoryName to find the category id
  useEffect(() => {
    if (!selectedCategoryId && selectedCategoryName) {
      const category = categories.find(category => category.name === selectedCategoryName);
      if (category) {
        setSelectedCategoryId(category.id);
      }
    }
  }, [selectedCategoryName, categories, selectedCategoryId]);

  // fetch links when the selected category id changes

  // create a useEffect that will update links whenever the selectedCategoryId changes
  useEffect(() => {
    if (selectedCategoryId) {
      const category = categories.find(category => category.id === selectedCategoryId);
      if (category) {
        setLinks(category.links.map(link => ({ ...link, id: link.id.toString(), title: link.title || "" })));
      }
    }
  }, [selectedCategoryId, categories]);

  // update links whenever the categories links change
  useEffect(() => {
    // find the current category id by using selectedCategoryName, so loop over categories and find the category with the same name
    const currentCategoryId = categories.find(category => category.name === selectedCategoryName)?.id;
    if (currentCategoryId) {
      const category = categories.find(category => category.id === currentCategoryId);
      if (category) {
        setLinks(category.links.map(link => ({ ...link, id: link.id.toString(), title: link.title || "" })));
      }
    }
    // print that this useEffect is rendering with unique id WW11
  }, [categories]);

  // update links whenever the links state changes

  // Function to toggle tabs
  const toggleTab = (tab: string) => {
    if (activeTab === tab) {
      setActiveTab(null);
    } else {
      setActiveTab(tab);
    }
  };

  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [showConfirmation, setShowConfirmation] = useState<string | null>(null);

  const handleDeleteLink = async (linkId: string) => {
    // If confirmation dialog is not shown yet, show it first
    if (showConfirmation !== linkId) {
      setShowConfirmation(linkId);
      return;
    }

    // If confirmed, proceed with deletion
    try {
      setDeletingIds(prev => [...prev, linkId]);

      const response = await fetch(`/api/links/delete?linkId=${linkId}`, {
        method: "DELETE",
      });

      // print response and mention that from the component name
      console.log("Response from handleDeleteLink: ", response);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete link");
      }

      // Success - clear confirmation state and refresh links
      setShowConfirmation(null);
      toast.success("Link deleted successfully");
      fetchCategories(setCategories);
    } catch (error: unknown) {
      console.error("Error deleting link:", error);
      if (error instanceof Error) {
        toast.error(error.message || "Error deleting link");
      } else {
        toast.error("Error deleting link");
      }
    } finally {
      setDeletingIds(prev => prev.filter(id => id !== linkId));
    }
  };

  const cancelDelete = () => {
    setShowConfirmation(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6 border border-gray-100">
      {/* Tab Navigation */}
      <div className="flex border-b overflow-x-auto scrollbar-hide ">
        <button
          className={`flex items-center px-4 py-3 border-b-2 font-medium text-sm transition-colors duration-200 whitespace-nowrap ${
            activeTab === "category"
              ? "border-blue-600 text-blue-600 bg-blue-50"
              : "border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50"
          } hover:cursor-pointer`}
          onClick={() => toggleTab("category")}
        >
          <Plus size={16} className="mr-2" />
          Add Category
        </button>

        <button
          className={`flex items-center px-4 py-3 border-b-2 font-medium text-sm transition-colors duration-200 whitespace-nowrap ${
            activeTab === "search-terms"
              ? "border-blue-600 text-blue-600 bg-blue-50"
              : "border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50"
          } hover:cursor-pointer`}
          onClick={() => toggleTab("search-terms")}
        >
          <Type size={16} className="mr-2" />
          Search Terms
        </button>

        <button
          className={`flex items-center px-4 py-3 border-b-2 font-medium text-sm transition-colors duration-200 whitespace-nowrap ${
            activeTab === "links"
              ? "border-blue-600 text-blue-600 bg-blue-50"
              : "border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50"
          } hover:cursor-pointer`}
          onClick={() => {
            setActiveTab(null);
          }}
        >
          <LinkIcon size={16} className="mr-2" />
          Manage Links
        </button>

        <button
          className={`flex items-center px-4 py-3 border-b-2 font-medium text-sm transition-colors duration-200 whitespace-nowrap ${
            activeTab === "template"
              ? "border-blue-600 text-blue-600 bg-blue-50"
              : "border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50"
          } hover:cursor-pointer`}
          onClick={() => toggleTab("template")}
        >
          <Settings size={16} className="mr-2" />
          Summary Template
        </button>
      </div>

      {/* Content Panels */}
      {activeTab === "category" && (
        <div className="p-5 bg-white animate-fadeIn">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-800">Add New Category</h3>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <CategoryAdder
              newCategoryName={newCategoryName}
              setNewCategoryName={setNewCategoryName}
              setAdding={setAdding}
              adding={adding}
              fetchCategories={() => fetchCategories(setCategories)}
              setCategories={setCategories}
            />
          </div>
        </div>
      )}

      {activeTab === "search-terms" && (
        <div className="p-5 bg-white animate-fadeIn">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-800">Add Search Terms</h3>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <SearchTermAdder categories={categories} fetchCategories={fetchCategories} setCategories={setCategories} />
          </div>
        </div>
      )}

      {activeTab === "links" && (
        <div className="p-6 bg-white rounded-lg shadow-sm">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">{selectedCategoryName} Links</h2>

          {/* Links Table */}
          <div className="mb-8">
            <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      URL
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {links && links.length > 0 ? (
                    links.map((link, index) => (
                      <tr
                        key={index}
                        className={`${
                          showConfirmation === link.id ? "bg-red-50" : "hover:bg-gray-50"
                        } transition-colors duration-200`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {link.title || "Untitled Link"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-xs">
                          {link.url}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {showConfirmation !== link.id ? (
                            <div className="flex space-x-3">
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-900 transition-colors duration-150"
                                aria-label="Visit link"
                              >
                                <ExternalLink size={18} />
                              </a>
                              <button
                                className="text-gray-400 hover:text-red-600 transition-colors duration-150 hover:cursor-pointer"
                                onClick={() => handleDeleteLink(link.id)}
                                aria-label="Delete link"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-3 animate-fade-in">
                              <span className="text-red-600 text-xs font-medium">Confirm delete?</span>
                              <button
                                className="px-2 py-1 text-xs bg-white text-gray-600 hover:text-gray-800 border border-gray-300 rounded shadow-sm transition-colors duration-150"
                                onClick={cancelDelete}
                              >
                                Cancel
                              </button>
                              <button
                                className="px-2 py-1 text-xs bg-red-500 text-white hover:bg-red-600 rounded shadow-sm transition-colors duration-150 flex items-center"
                                onClick={() => handleDeleteLink(link.id)}
                                disabled={deletingIds.includes(link.id)}
                              >
                                {deletingIds.includes(link.id) ? (
                                  <span className="flex items-center">
                                    <svg
                                      className="animate-spin -ml-1 mr-1 h-3 w-3 text-white"
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                    >
                                      <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                      ></circle>
                                      <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                      ></path>
                                    </svg>
                                    Deleting
                                  </span>
                                ) : (
                                  <span>Confirm</span>
                                )}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                        No links added yet. Use the form below to add your first link.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Horizontal Add Link Form */}
          <LinkForm
            categoryId={String(selectedCategoryId)}
            categoryName={selectedCategoryName}
            onLinkAdded={() => fetchCategories(setCategories)}
          />
        </div>
      )}

      {activeTab === "template" && (
        <div className="p-5 bg-white animate-fadeIn">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-800">Summary Prompt Template</h3>
            <button
              onClick={() => setEditingPrompt(!editingPrompt)}
              className="text-blue-600 hover:text-blue-800 flex items-center text-sm font-medium px-3 py-1 rounded-md hover:bg-blue-50 transition-colors duration-200"
            >
              <Edit size={16} className="mr-1" />
              {editingPrompt ? "Save" : "Edit"}
            </button>
          </div>

          {editingPrompt ? (
            <textarea
              value={summaryPrompt}
              onChange={e => setSummaryPrompt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-36 text-sm"
              placeholder="Enter your summary prompt template..."
            />
          ) : (
            <div className="p-4 bg-gray-50 rounded-md text-gray-700 border border-gray-100 text-sm whitespace-pre-wrap min-h-[9rem]">
              {summaryPrompt}
            </div>
          )}

          <div className="mt-4 p-4 bg-blue-50 rounded-md text-sm text-blue-700 border border-blue-100">
            <p className="font-medium mb-2">Template Variables:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center p-2 bg-white rounded border border-blue-200">
                <code className="bg-blue-100 px-2 py-1 rounded text-blue-800 font-mono text-xs">#article_content#</code>
                <span className="ml-2 text-xs">Insert article content</span>
              </div>
              <div className="flex items-center p-2 bg-white rounded border border-blue-200">
                <code className="bg-blue-100 px-2 py-1 rounded text-blue-800 font-mono text-xs">#numbers#</code>
                <span className="ml-2 text-xs">Insert word count</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Show a welcome message if no tab is selected */}
      {/* {!activeTab && (
        <div className="p-8 text-center animate-fadeIn">
          <div className="text-gray-400 mb-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">Category Management Tools</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Select a tab above to manage your categories, search terms, links, or summary template.
          </p>
        </div>
      )} */}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
