import React, { useState } from "react";
import CategoryAdder from "./CategoryAdder";
import SearchTermAdder from "./SearchTermAdder";
import { fetchCategories } from "@/utils/utils";
import { Category } from "@/utils/utils";
import { Edit, Plus, Settings, Link as LinkIcon, Type } from "lucide-react";

export default function CategoryManager({
  newCategoryName,
  setNewCategoryName,
  categories,
  setCategories,
}: {
  newCategoryName: string;
  setNewCategoryName: (name: string) => void;
  categories: Category[];
  fetchCategories: (setCategories: React.Dispatch<React.SetStateAction<Category[]>>) => void;
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
}) {
  const [editingPrompt, setEditingPrompt] = useState(false);
  // this will be used to track if the user is adding a new category and show a loading spinner
  const [adding, setAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const [summaryPrompt, setSummaryPrompt] = useState(
    "Summarise the following: #article_content# , DO NOT EXCEED #numbers# words"
  );

  // Function to toggle tabs
  const toggleTab = (tab: string) => {
    if (activeTab === tab) {
      setActiveTab(null);
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6 border border-gray-100">
      {/* Tab Navigation */}
      <div className="flex border-b overflow-x-auto scrollbar-hide">
        <button
          className={`flex items-center px-4 py-3 border-b-2 font-medium text-sm transition-colors duration-200 whitespace-nowrap ${
            activeTab === "category"
              ? "border-blue-600 text-blue-600 bg-blue-50"
              : "border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50"
          }`}
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
          }`}
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
          }`}
          onClick={() => toggleTab("links")}
        >
          <LinkIcon size={16} className="mr-2" />
          Manage Links
        </button>

        <button
          className={`flex items-center px-4 py-3 border-b-2 font-medium text-sm transition-colors duration-200 whitespace-nowrap ${
            activeTab === "template"
              ? "border-blue-600 text-blue-600 bg-blue-50"
              : "border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50"
          }`}
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
              fetchCategories={fetchCategories}
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
        <div className="p-5 bg-white animate-fadeIn">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-800">Manage Category Links</h3>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div className="grid grid-cols-1 gap-4">
              <div className="mb-4">
                <label htmlFor="link-category" className="block text-sm font-medium text-gray-700 mb-1">
                  Select Category
                </label>
                <select
                  id="link-category"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">Select a category...</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label htmlFor="link-url" className="block text-sm font-medium text-gray-700 mb-1">
                  Link URL
                </label>
                <input
                  type="url"
                  id="link-url"
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="link-title" className="block text-sm font-medium text-gray-700 mb-1">
                  Link Title (Optional)
                </label>
                <input
                  type="text"
                  id="link-title"
                  placeholder="Enter a descriptive title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors duration-200 text-sm font-medium flex items-center justify-center w-full md:w-auto">
                <Plus size={16} className="mr-2" />
                Add Link
              </button>
            </div>
          </div>
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
      {!activeTab && (
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
