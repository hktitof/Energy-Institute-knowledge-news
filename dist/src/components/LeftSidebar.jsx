// components/LeftSidebar.tsx
import React, { useState, useMemo } from "react"; // Import useState and useMemo
import { RefreshCw, AlertTriangle, Folder, Search } from "lucide-react";
import CategoryCard from "./CategoryCard";
import Image from "next/image";
import StatsAndFilterBar from "./StatsAndFilterBar"; // Import the new component
const LeftSidebar = ({ categories, setCategories, isLoadingCategories, isRetryingCategories, retryCountCategories, hasErrorCategories, deletingCategoryId, toggleCategoryTable, deleteCategory, loadingSearchTermId, removeSearchTerm, categoriesFetching, setCategoriesFetching, categoriesStatus, refFetchNews, fetchNewsForCategory, fetchAllNews, isFetchingAllNewsByButton, setActiveTab, setSelectedCategoryName, fetchCategories, setSelectedCategoryId, }) => {
    // --- State for the filter term ---
    const [filterTerm, setFilterTerm] = useState("");
    // --- Memoized filtered categories ---
    const filteredCategories = useMemo(() => {
        if (!filterTerm) {
            return categories; // Return all if filter is empty
        }
        const lowerCaseFilter = filterTerm.toLowerCase().trim();
        if (!lowerCaseFilter) {
            return categories; // Also return all if filter is just whitespace
        }
        return categories.filter(category => 
        // Check category name (case-insensitive)
        category.name.toLowerCase().includes(lowerCaseFilter) ||
            // Check if *any* search term matches (case-insensitive)
            category.searchTerms.some(term => term.toLowerCase().includes(lowerCaseFilter)));
    }, [categories, filterTerm]); // Recalculate when categories or filterTerm change
    // Render function for different loading states
    const renderLoadingStates = () => {
        // Initial loading
        if (isLoadingCategories && !isRetryingCategories) {
            // ... (keep existing loading state)
            return (<div className="flex flex-col justify-center items-center h-full px-4 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
          <p className="text-gray-600">Loading categories...</p>
        </div>);
        }
        // Retrying state
        if (isRetryingCategories) {
            // ... (keep existing retrying state)
            return (<div className="flex flex-col justify-center items-center h-full px-4 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
            <p className="text-indigo-600 font-medium">Database is resuming...</p>
            <p className="text-gray-500 mt-1 text-sm">Retry attempt {retryCountCategories} of 5</p> {/* Assuming maxRetries is 5 from hook */}
            <button onClick={fetchCategories} // Assuming this triggers a reload
             className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition shadow">
                Try again now
            </button>
            </div>);
        }
        // Error state
        if (hasErrorCategories) {
            // ... (keep existing error state)
            return (<div className="flex flex-col justify-center items-center h-full px-4 text-center">
            <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4 flex items-center text-sm">
                <AlertTriangle className="mr-2 flex-shrink-0" size={18}/>
                <span>Failed to load categories. {hasErrorCategories}</span>
            </div>
            <p className="text-gray-600 mb-4 text-sm">The database might be unavailable or still resuming.</p>
            <button onClick={() => window.location.reload()} // Simple page refresh
             className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition shadow">
                Refresh Page
            </button>
            </div>);
        }
        // No categories found (after loading/no error)
        if (!isLoadingCategories && !hasErrorCategories && categories.length === 0) {
            return (<div className="flex flex-col justify-center items-center h-full px-4 text-center">
          <Folder size={40} className="text-gray-400 mb-4"/>
          <p className="text-gray-600 font-medium">No Categories Found</p>
          <p className="text-gray-500 text-sm mt-1">Create a new category to get started.</p>
          {/* Optional: Add a button here to trigger category creation */}
        </div>);
        }
        // --- Normal state: Render filtered categories ---
        // No results from filter
        if (filteredCategories.length === 0 && filterTerm) {
            return (<div className="flex flex-col justify-center items-center h-full px-4 text-center pt-10">
          <Search size={32} className="text-gray-400 mb-3"/>
          <p className="text-gray-600 font-medium">No Matching Categories</p>
          <p className="text-gray-500 text-sm mt-1">Try adjusting your filter term.</p>
        </div>);
        }
        // --- Render the filtered list ---
        return (<>
        {filteredCategories.map(category => ( // <-- Use filteredCategories here
            <CategoryCard key={category.id} category={category} 
            // Pass original categories if needed by Card actions
            categories={categories} setCategories={setCategories} deletingCategoryId={deletingCategoryId} toggleCategoryTable={toggleCategoryTable} deleteCategory={deleteCategory} loadingSearchTermId={loadingSearchTermId} removeSearchTerm={removeSearchTerm} categoriesFetching={categoriesFetching} setCategoriesFetching={setCategoriesFetching} categoriesStatus={categoriesStatus} refFetchNews={refFetchNews} fetchNewsForCategory={fetchNewsForCategory} setActiveTab={setActiveTab} setSelectedCategoryName={setSelectedCategoryName} fetchCategories={fetchCategories} setSelectedCategoryId={setSelectedCategoryId}/>))}
      </>);
    };
    return (
    // Ensure the main container allows the sticky bar to work within its scroll context
    <div className="w-1/3 bg-gray-50 shadow-lg flex flex-col h-screen max-h-screen"> {/* Use h-screen for full height */}
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white flex-shrink-0"> {/* flex-shrink-0 prevents header shrinking */}
        <Image src="/energy-institute-logo.svg" alt="The Energy Institute" width={350} height={50} priority // Prioritize loading the logo
    />
      </div>

      {/* --- Stats and Filter Bar --- */}
      {/* Render only when not in initial load/error states */}
      {!isLoadingCategories && !hasErrorCategories && categories.length > 0 && (<StatsAndFilterBar categories={categories} // Pass the *original* full list for stats
         filterTerm={filterTerm} onFilterChange={setFilterTerm} // Pass the setter function
        />)}


      {/* Categories container with scroll */}
      {/* Apply overflow-y-auto here and make it take remaining space */}
      <div className="flex-grow overflow-y-auto pb-24 pt-3 px-3"> {/* Added padding, increased pb */}
          {renderLoadingStates()}
      </div>


      {/* Fixed bottom section for "Fetch All News" button */}
      {!isLoadingCategories && !hasErrorCategories && categories.length > 0 && (<div className="absolute bottom-0 left-0 w-1/3 p-4 bg-white border-t border-gray-200 shadow-inner flex-shrink-0 z-20"> {/* Added z-index */}
          <button className={`w-full bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 transition duration-150 ease-in-out shadow-md flex items-center justify-center gap-2 text-sm font-medium
            ${isFetchingAllNewsByButton ? "opacity-60 cursor-wait" : "hover:cursor-pointer"}
            `} onClick={fetchAllNews} // Keep onClick as is
         disabled={isFetchingAllNewsByButton}>
            {isFetchingAllNewsByButton ? (<RefreshCw className="animate-spin text-white" size={16}/>) : (<RefreshCw size={16}/>)}
            <span key="fetch-all-news">{isFetchingAllNewsByButton ? "Fetching All News..." : "Fetch All News"}</span>
          </button>
        </div>)}
    </div>);
};
export default LeftSidebar;
