// components/StatsAndFilterBar.tsx
import React, { useMemo } from "react";
import { Category } from "../utils/utils"; // Adjust path if needed
import { Folder, Search, FileText, AlertCircle, XCircle, Filter } from "lucide-react";

interface Stats {
  totalCategories: number;
  totalSearchTerms: number;
  totalArticles: number;
  notArticleCount: number;
  errorArticleCount: number;
}

interface StatsAndFilterBarProps {
  categories: Category[];
  filterTerm: string;
  onFilterChange: (term: string) => void;
}

const StatsAndFilterBar: React.FC<StatsAndFilterBarProps> = ({ categories, filterTerm, onFilterChange }) => {
  // Calculate statistics using useMemo for performance
  const stats: Stats = useMemo(() => {
    let totalSearchTerms = 0;
    let totalArticles = 0;
    let notArticleCount = 0;
    let errorArticleCount = 0;

    categories.forEach(category => {
      totalSearchTerms += category.searchTerms?.length || 0;
      totalArticles += category.articles?.length || 0;
      category.articles?.forEach(article => {
        // Ensure title exists and is a string before checking
        const titleLower = typeof article.title === "string" ? article.title.toLowerCase() : "";
        if (titleLower === "not an article") {
          notArticleCount++;
        } else if (titleLower.includes("error") || titleLower.includes("access denied")) {
          // Add more specific error checks if needed
          errorArticleCount++;
        }
      });
    });

    return {
      totalCategories: categories.length,
      totalSearchTerms,
      totalArticles,
      notArticleCount,
      errorArticleCount,
    };
  }, [categories]); // Recalculate only when categories change

  return (
    <div className="p-4 border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
      {/* Stats Row */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 items-center mb-4 text-xs text-gray-600">
        <div className="flex items-center gap-1" title="Total Categories">
          <Folder size={14} className="text-blue-500" />
          <span className="font-medium">{stats.totalCategories}</span>
          <span className="hidden sm:inline">Categories</span>
        </div>
        <div className="flex items-center gap-1" title="Total Search Terms">
          <Search size={14} className="text-green-500" />
          <span className="font-medium">{stats.totalSearchTerms}</span>
          <span className="hidden sm:inline">Terms</span>
        </div>
        <div className="flex items-center gap-1" title="Total Articles Fetched">
          <FileText size={14} className="text-indigo-500" />
          <span className="font-medium">{stats.totalArticles}</span>
          <span className="hidden sm:inline">Articles</span>
        </div>
        {stats.notArticleCount > 0 && (
          <div className="flex items-center gap-1" title="Non-Article Content Found">
            <AlertCircle size={14} className="text-yellow-500" />
            <span className="font-medium">{stats.notArticleCount}</span>
            <span className="hidden sm:inline">Not Articles</span>
          </div>
        )}
        {stats.errorArticleCount > 0 && (
          <div className="flex items-center gap-1" title="Articles with Errors">
            <XCircle size={14} className="text-red-500" />
            <span className="font-medium">{stats.errorArticleCount}</span>
            <span className="hidden sm:inline">Errors</span>
          </div>
        )}
      </div>

      {/* Filter Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Filter size={16} className="text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Filter categories or search terms..."
          value={filterTerm}
          onChange={e => onFilterChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition duration-150"
        />
        {filterTerm && (
          <button
            onClick={() => onFilterChange("")}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            aria-label="Clear filter"
          >
            <XCircle size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default StatsAndFilterBar;
