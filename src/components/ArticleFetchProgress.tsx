import React from "react";
import { Loader } from "lucide-react";

interface ArticleFetchProgressProps {
  totalArticles: number;
  fetchedCount: number;
  errorCount: number;
  currentArticle: string | null;
  isActive: boolean;
}

const ArticleFetchProgress: React.FC<ArticleFetchProgressProps> = ({
  totalArticles,
  fetchedCount,
  errorCount,
  currentArticle,
  isActive,
}) => {
  if (!isActive) return null;

  return (
    <div className="mt-2  rounded-md p-3 bg-gray-50">
      <div className="flex justify-between items-center mb-2">
        <div className="text-sm font-medium">Fetching Articles Progress</div>
        <div className="text-xs text-gray-500">
          {fetchedCount + errorCount}/{totalArticles} completed
        </div>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-3">
        <div
          className="bg-blue-600 h-2.5 rounded-full"
          style={{ width: `${totalArticles > 0 ? ((fetchedCount + errorCount) / totalArticles) * 100 : 0}%` }}
        ></div>
      </div>

      <div className="flex justify-between text-xs">
        <div className="flex items-center">
          {currentArticle && (
            <>
              <Loader size={12} className="animate-spin mr-1" />
              <span className="truncate max-w-xs">Fetching: {currentArticle}</span>
            </>
          )}
        </div>
        <div className="flex space-x-3">
          <span className="text-green-600">{fetchedCount} successful</span>
          <span className="text-red-600">{errorCount} failed</span>
        </div>
      </div>
    </div>
  );
};

export default ArticleFetchProgress;
