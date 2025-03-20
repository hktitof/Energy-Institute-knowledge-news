import React, { useState, useEffect } from "react";
import CategoryAdder from "./CategoryAdder";
import SearchTermAdder from "./SearchTermAdder";
import { fetchCategories } from "@/utils/utils";
import type { Category } from "@/utils/utils";
import { Plus, Trash2, Settings, ExternalLink, Link as LinkIcon, Type, X } from "lucide-react";
import { toast } from "react-toastify";
import CategoryLinksManager from "./CategoryLinksManager";

// Link interfaces
interface Link {
  id: number;
  url: string;
  title: string | null;
}

import ArticleSummarizerTab from "./ArticleSummarizerTab";
export default function CategoryManager({
  newCategoryName,
  setNewCategoryName,
  categories,
  setCategories,
  activeTab,
  setActiveTab,
  selectedCategoryName,
  updateCategories,
}: {
  newCategoryName: string;
  setNewCategoryName: (name: string) => void;
  categories: Category[];
  fetchCategories: (setCategories: React.Dispatch<React.SetStateAction<Category[]>>) => Promise<void>;
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  activeTab: string | null;
  setActiveTab: (tab: string | null) => void;
  selectedCategoryName: string;
  updateCategories: () => Promise<void>;
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
            <button
              onClick={() => setActiveTab(null)}
              className="bg-gray-400 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded hover:cursor-pointer"
            >
              <X size={16} className="mr-1" />
              {/* Close */}
            </button>
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
            <button
              onClick={() => setActiveTab(null)}
              className="bg-gray-400 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded hover:cursor-pointer"
            >
              <X size={16} className="mr-1" />
              {/* Close */}
            </button>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <SearchTermAdder categories={categories} fetchCategories={fetchCategories} setCategories={setCategories} />
          </div>
        </div>
      )}

      {activeTab === "links" && (
        <div className="px-6 pb-6 pt-3 bg-white rounded-lg shadow-sm ">
          <div className=" flex justify-end items-center mb-2">
            {/* <h2 className="text-2xl font-semibold text-gray-800 mb-6">{selectedCategoryName} Links</h2> */}
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

          {/* Horizontal Add Link Form */}
          <CategoryLinksManager
            categoryId={categories.find(category => category.id === selectedCategoryId)?.id.toString() || ""}
            categoryName={categories.find(category => category.id === selectedCategoryId)?.name || ""}
            links={(categories.find(category => category.id === selectedCategoryId)?.links || []).map(link => ({
              ...link,
              title: link.title || null,
            }))}
            updateCategories={updateCategories}
          />
        </div>
      )}

      {activeTab === "template" && (
        <ArticleSummarizerTab setActiveParentTab={setActiveTab} activeParentTab={activeTab} />
      )}

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
