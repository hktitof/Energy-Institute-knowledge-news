import React, { useState, useEffect } from "react";
import CategoryAdder from "./CategoryAdder";
import SearchTermAdder from "./SearchTermAdder";
import { fetchCategories } from "@/utils/utils";
import type { Category } from "@/utils/utils";

import CategoryLinksManager from "./CategoryLinksManager";

import ArticleSummarizerTab from "./ArticleSummarizerTab";
import KnowledgeNoteGenerator from "./NoteGenerator";
import SettingsModal from "./SettingsModal";
export default function CategoryManager({
  newCategoryName,
  setNewCategoryName,
  categories,
  setCategories,
  activeTab,
  setActiveTab,
  selectedCategoryName,
  updateCategories,
  articleUserPrompt,
  setArticleUserPrompt,
  setArticleSystemPrompt,
  articleSystemPrompt,
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
  articleUserPrompt: string;
  setArticleUserPrompt: React.Dispatch<React.SetStateAction<string>>;
  setArticleSystemPrompt: React.Dispatch<React.SetStateAction<string>>;
  articleSystemPrompt: string;
}) {
  // this will be used to track if the user is adding a new category and show a loading spinner
  const [adding, setAdding] = useState(false);

  const [, setLinks] = useState<{ id: string; title: string; url: string }[]>([]);

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

  // const [deletingIds, setDeletingIds] = useState<string[]>([]);
  // const [showConfirmation, setShowConfirmation] = useState<string | null>(null);

  return (
    <div className="w-full bg-white rounded-lg shadow-sm overflow-hidden mb-6 border border-gray-100">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          <a
            onClick={() => toggleTab("category")}
            className={`group flex items-center whitespace-nowrap py-3 px-5 border-b-2 ${
              activeTab === "category"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent hover:border-indigo-400 text-gray-600 hover:text-indigo-600"
            } font-medium transition-colors cursor-pointer`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 mr-2 ${
                activeTab === "category" ? "text-indigo-500" : "text-gray-400 group-hover:text-indigo-500"
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
            Add Category
          </a>

          <a
            onClick={() => toggleTab("search-terms")}
            className={`group flex items-center whitespace-nowrap py-3 px-5 border-b-2 ${
              activeTab === "search-terms"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent hover:border-indigo-400 text-gray-600 hover:text-indigo-600"
            } font-medium transition-colors cursor-pointer`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 mr-2 ${
                activeTab === "search-terms" ? "text-indigo-500" : "text-gray-400 group-hover:text-indigo-500"
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            Search Terms
          </a>

          {activeTab === "links" && (
            <a
              onClick={() => toggleTab("links")}
              className={`group flex items-center whitespace-nowrap py-3 px-5 border-b-2 ${
                activeTab === "links"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent hover:border-indigo-400 text-gray-600 hover:text-indigo-600"
              } font-medium transition-colors cursor-pointer`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-4 w-4 mr-2 ${
                  activeTab === "links" ? "text-indigo-500" : "text-gray-400 group-hover:text-indigo-500"
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
              Manage Links
            </a>
          )}

          <a
            onClick={() => toggleTab("template")}
            className={`group flex items-center whitespace-nowrap py-3 px-5 border-b-2 ${
              activeTab === "template"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent hover:border-indigo-400 text-gray-600 hover:text-indigo-600"
            } font-medium transition-colors cursor-pointer`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 mr-2 ${
                activeTab === "template" ? "text-indigo-500" : "text-gray-400 group-hover:text-indigo-500"
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            Summarize Article
          </a>

          <a
            onClick={() => toggleTab("generator")}
            className={`group flex items-center whitespace-nowrap py-3 px-5 border-b-2 ${
              activeTab === "generator"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent hover:border-indigo-400 text-gray-600 hover:text-indigo-600"
            } font-medium transition-colors cursor-pointer`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 mr-2 ${
                activeTab === "generator" ? "text-indigo-500" : "text-gray-400 group-hover:text-indigo-500"
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
            Note Generator
          </a>

          <a
            onClick={() => toggleTab("settings")}
            className={`group flex items-center whitespace-nowrap py-3 px-5 border-b-2 ${
              activeTab === "generator"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent hover:border-indigo-400 text-gray-600 hover:text-indigo-600"
            } font-medium transition-colors cursor-pointer`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 mr-2 ${
                activeTab === "generator" ? "text-indigo-500" : "text-gray-400 group-hover:text-indigo-500"
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
            Settings
          </a>

          {!(activeTab === null) && (
            <a
              onClick={() => setActiveTab(null)}
              className="group flex items-center whitespace-nowrap py-3 px-5 border-b-2 border-transparent hover:border-gray-300 font-medium text-gray-500 hover:text-gray-700 transition-colors cursor-pointer ml-auto"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-2 text-gray-400 group-hover:text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {activeTab ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                )}
              </svg>
              {activeTab ? "Collapse" : "Expand"}
            </a>
          )}
        </nav>
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

      {activeTab === "generator" && (
        <KnowledgeNoteGenerator
          categories={categories}
          updateCategories={updateCategories}
          setActiveTab={setActiveTab}
          activeTab={activeTab}
        />
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
        <div className="px-6 pb-6 pt-3 bg-white rounded-lg shadow-sm ">
          <div className=" flex justify-end items-center mb-2">
            {/* <h2 className="text-2xl font-semibold text-gray-800 mb-6">{selectedCategoryName} Links</h2> */}
            {/* // add hide button which is not rectangle buse like a gray button, that has an 
            // arrow directed to the top */}
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
      {/* Settings Modal Overlay */}
      {/* Settings Modal Overlay */}
      {activeTab === "settings" && (
        <SettingsModal
          articleUserPrompt={articleUserPrompt}
          setArticleUserPrompt={setArticleUserPrompt}
          setArticleSystemPrompt={setArticleSystemPrompt}
          articleSystemPrompt={articleSystemPrompt}
          setActiveTab={setActiveTab}
          onSavePrompts={prompts => {
            // Handle saving prompts here
            console.log("Saving prompts:", prompts);
          }}
        />
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
