import React, { useState, useEffect } from "react";
import CategoryAdder from "./CategoryAdder";
import SearchTermAdder from "./SearchTermAdder";
import { fetchCategories } from "@/utils/utils";
import type { Category } from "@/utils/utils";
import { Plus, Trash2, Settings, ExternalLink, Link as LinkIcon, Type, X } from "lucide-react";
import { toast } from "react-toastify";
import LinkForm from "./LinkForm";

import ArticleSummarizerTab from "./ArticleSummarizerTab";
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
  // this will be used to track if the user is adding a new category and show a loading spinner
  const [adding, setAdding] = useState(false);

  const [links, setLinks] = useState<{ id: string; title: string; url: string }[]>([]);

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  // Update selectedCategoryId whenever selectedCategoryName changes
  useEffect(() => {
    // Find the category with the matching name
    const category = categories.find(category => category.name === selectedCategoryName);

    if (category) {
      console.log("Updating selectedCategoryId based on name change:", category.id);
      setSelectedCategoryId(category.id);
    } else {
      // Reset if no matching category is found
      setSelectedCategoryId(null);
    }
  }, [selectedCategoryName, categories]);

  // fetch links when the selected category id changes
  useEffect(() => {
    if (selectedCategoryId) {
      const category = categories.find(category => category.id === selectedCategoryId);
      if (category) {
        setLinks(category.links.map(link => ({ ...link, id: link.id.toString(), title: link.title || "" })));
      }
    }
  }, [selectedCategoryId, categories]);

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

  // Debug logs
  console.log("Selected Category Name: ", selectedCategoryName);
  console.log("Selected Category ID: ", selectedCategoryId);

  return (
    <div className="w-full bg-white rounded-lg shadow-sm overflow-hidden mb-6 border border-gray-100">
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

        {activeTab === "links" && (
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
        )}

        <button
          className={`flex items-center px-4 py-3 border-b-2 font-medium text-sm transition-colors duration-200 whitespace-nowrap ${
            activeTab === "template"
              ? "border-blue-600 text-blue-600 bg-blue-50"
              : "border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50"
          } hover:cursor-pointer`}
          onClick={() => toggleTab("template")}
        >
          <Settings size={16} className="mr-2" />
          Summarize Article
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
          <div className=" flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">{selectedCategoryName} Links</h2>
            {/* // add hide button which is not rectangle buse like a gray button, that has an 
            // arrow directed to the top */}
            <button
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 hover:cursor-pointer"
              onClick={() => {
                setActiveTab(null);
              }}
            >
              <X size={16} />
            </button>
          </div>

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

      {activeTab === "template" && <ArticleSummarizerTab  setActiveParentTab={setActiveTab} activeParentTab={activeTab}/>} 

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
