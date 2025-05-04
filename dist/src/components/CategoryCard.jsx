// components/CategoryCard.tsx
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, X, ExternalLink, Loader, Trash2, Globe } from "lucide-react";
import { Dialog } from "@headlessui/react";
import CategoryActionButtons from "./CategoryActionButtons";
import LinkList from "./LinkList";
import { useState } from "react";
// Tooltip component
const Tooltip = ({ text, children }) => (<div className="relative inline-block">
    <div className="peer">{children}</div>
    <div className="opacity-0 peer-hover:opacity-100 transition-opacity absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded-md shadow-lg whitespace-nowrap">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
    </div>
  </div>);
const ExternalLinkIcon = ExternalLink;
const TrashIcon = Trash2;
const SpinnerIcon = Loader;
const ChevronUpIcon = ChevronUp;
const CategoryCard = ({ category, categories, setCategories, deletingCategoryId, toggleCategoryTable, deleteCategory, loadingSearchTermId, removeSearchTerm, categoriesFetching, setCategoriesFetching, categoriesStatus, refFetchNews, fetchNewsForCategory, setActiveTab, setSelectedCategoryName, fetchCategories, setSelectedCategoryId, }) => {
    // Add state to your component
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState(null);
    // Add these functions in your component
    const handleDeleteConfirm = (e) => {
        if (categoryToDelete) {
            deleteCategory(categoryToDelete, e);
        }
        setIsDeleteConfirmOpen(false);
        setCategoryToDelete(null);
    };
    const handleDeleteCancel = () => {
        setIsDeleteConfirmOpen(false);
        setCategoryToDelete(null);
    };
    return (<>
      <AnimatePresence>
        {isDeleteConfirmOpen && (<Dialog open={isDeleteConfirmOpen} onClose={handleDeleteCancel} className="relative z-50">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true"/>

            <div className="fixed inset-0 flex items-center justify-center p-4">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
                <Dialog.Title className="text-lg font-semibold text-gray-900">Delete Category</Dialog.Title>
                <Dialog.Description className="mt-2 text-sm text-gray-500">
                  Are you sure you want to delete this category? This action cannot be undone.
                </Dialog.Description>

                <div className="mt-6 flex justify-end space-x-3">
                  <button onClick={handleDeleteCancel} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleDeleteConfirm} className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    Delete Category
                  </button>
                </div>
              </motion.div>
            </div>
          </Dialog>)}
      </AnimatePresence>
      <div className="border rounded-md border-gray-300 mb-3 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 bg-white">
        <motion.div className="group p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50/80 transition-colors border-b border-gray-100" onClick={() => {
            toggleCategoryTable(category.id);
            setActiveTab(null);
            setSelectedCategoryName(category.name);
        }}>
          <div className="flex items-center space-x-4">
            {/* Category title with status indicator */}
            <div className="relative">
              <h2 className="text-sm font-semibold text-gray-900 tracking-tight">{category.name}</h2>
              <div className="absolute -right-3 -top-2">
                {categoriesStatus.find(status => status.categoryId === category.id)?.isFetchedAllArticles && (<div className="relative" title="Data updated">
                    <div className="absolute animate-ping h-2 w-2 bg-green-400 rounded-full opacity-75"></div>
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  </div>)}
              </div>
            </div>

            {/* Compact metrics */}
            <div className="flex items-center space-x-3 text-gray-500">
              <div className="flex items-center space-x-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text h-4 w-4 text-blue-500">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <path d="M16 13h-6"/>
                  <path d="M16 17H8"/>
                  <path d="M10 9h-2"/>
                </svg>
                <span className="text-xs font-medium">{category.searchTerms.length}</span>
              </div>

              {category.links && (<div className="flex items-center space-x-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-link h-4 w-4 text-purple-500">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                  </svg>
                  <span className="text-xs font-medium">{category.links.length}</span>
                </div>)}
            </div>
          </div>

          {/* Action buttons with better spacing */}
          <div className="flex items-center  space-x-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <button>
              <a href={`https://www.google.co.uk/search?q=${encodeURIComponent(category.searchTerms.join(" OR "))}&tbm=nws&tbs=qdr:w`} target="_blank" rel="noopener noreferrer" className="w-4 h-4 p-1.5 rounded-lg text-gray-400  hover:text-blue-600 transition-colors" onClick={e => e.stopPropagation()}>
                <ExternalLinkIcon className="h-4 w-4"/>
              </a>
            </button>

            <Tooltip text="Delete Category">
              <button className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors" onClick={e => {
            e.stopPropagation();
            setIsDeleteConfirmOpen(true);
            setCategoryToDelete(category.id.toString());
        }} disabled={deletingCategoryId === category.id.toString()}>
                {deletingCategoryId === category.id.toString() ? (<SpinnerIcon className="h-4 w-4 animate-spin"/>) : (<TrashIcon className="h-4 w-4"/>)}
              </button>
            </Tooltip>

            <div className="w-px h-6 bg-gray-200 mx-1"></div>

            <button className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors" onClick={e => e.stopPropagation()}>
              {category.showTable ? (<ChevronUpIcon className="h-5 w-5"/>) : (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-down h-5 w-5">
                  <path d="m6 9 6 6 6-6"/>
                </svg>)}
            </button>
          </div>
        </motion.div>

        <AnimatePresence>
          {(category.showTable || categoriesFetching === category.id) && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="px-5 pb-5 pt-0 overflow-hidden">
              {/* Search Terms Section */}
              <SearchTermsSection category={category} loadingSearchTermId={loadingSearchTermId} removeSearchTerm={removeSearchTerm}/>

              {/* Links Section */}
              <CategoryLinksSection category={category} setCategories={setCategories} fetchCategories={fetchCategories} setSelectedCategoryName={setSelectedCategoryName} setActiveTab={setActiveTab} setSelectedCategoryId={setSelectedCategoryId}/>

              {/* Action Buttons */}
              <CategoryActionButtons category={category} categories={categories} setCategories={setCategories} categoriesStatus={categoriesStatus} setCategoriesFetching={setCategoriesFetching} fetchNewsForCategory={fetchNewsForCategory} refFetchNews={refFetchNews} setSelectedCategoryName={setSelectedCategoryName} setActiveTab={setActiveTab}/>
            </motion.div>)}
        </AnimatePresence>
      </div>
    </>);
};
const SearchTermsSection = ({ category, loadingSearchTermId, removeSearchTerm }) => {
    if (category.searchTerms.length === 0) {
        return null;
    }
    return (<div className="mb-4">
      <div className="flex flex-wrap gap-2">
        {category.searchTerms.map((term, index) => (<div key={index} className="flex items-center bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full shadow-sm">
            <span className="text-xs font-medium">{term}</span>
            <button className={`ml-1.5 rounded-full  ${loadingSearchTermId === index
                ? "text-gray-400 cursor-not-allowed"
                : "text-blue-500 hover:text-red-500 hover:bg-blue-100 transition-colors duration-200 hover:cursor-pointer"}`} onClick={() => removeSearchTerm(category.id, index)} disabled={loadingSearchTermId === index}>
              {loadingSearchTermId === index ? <Loader size={14} className="animate-spin"/> : <X size={14}/>}
            </button>
          </div>))}
      </div>
    </div>);
};
const CategoryLinksSection = ({ category, setCategories, fetchCategories, setSelectedCategoryName, setActiveTab, setSelectedCategoryId, }) => {
    if (!category.links || category.links.length === 0) {
        return null;
    }
    return (<div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xs font-medium text-gray-700">Saved Links</h3>
      </div>

      {category.links.length <= 5 ? (<LinkList fetchCategories={fetchCategories} category={category} setCategories={setCategories}/>) : (
        // Grid with pagination for many links
        <div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            {category.links.slice(0, 6).map((link, index) => (<a key={index} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center p-2 rounded-md hover:bg-gray-50 border border-gray-100 group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <Globe size={14} className="text-gray-400 flex-shrink-0"/>
                    <span className="text-xs text-gray-700 font-medium truncate">{link.title || "Untitled"}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-1">{link.url}</p>
                </div>
              </a>))}
          </div>

          {category.links.length > 6 && (<div className="flex justify-between items-center text-sm text-gray-500">
              <span>Showing 6 of {category.links.length} links</span>
              <button onClick={() => {
                    setSelectedCategoryName(category.name);
                    setActiveTab("links");
                    setSelectedCategoryId(category.id);
                }} className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:cursor-pointer">
                View all links
              </button>
            </div>)}
        </div>)}
    </div>);
};
export default CategoryCard;
