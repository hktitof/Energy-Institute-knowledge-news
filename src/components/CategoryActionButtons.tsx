// imports
import { Category, CategoryStatus } from "../utils/utils";
// import icons
import { Link, RefreshCw, Loader } from "lucide-react";

// Category Action Buttons Component
interface CategoryActionButtonsProps {
  category: Category;
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  categoriesStatus: CategoryStatus[];
  setCategoriesFetching: React.Dispatch<React.SetStateAction<string | number | null>>;
  fetchNewsForCategory: (categoryId: string | number, customLinks: string[], categories: Category[]) => Promise<void>;
  refFetchNews: React.RefObject<HTMLSpanElement | null>;
  setSelectedCategoryName: React.Dispatch<React.SetStateAction<string | null>>;
  setActiveTab: React.Dispatch<React.SetStateAction<string | null>>;
}
const CategoryActionButtons: React.FC<CategoryActionButtonsProps> = ({
  category,
  categories,
  setCategories,
  categoriesStatus,
  setCategoriesFetching,
  fetchNewsForCategory,
  refFetchNews,
  setSelectedCategoryName,
  setActiveTab,
}) => {
  return (
    <div className="flex justify-between items-center mt-4">
      <div className="flex space-x-2">
        <button
          className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors duration-200 hover:cursor-pointer"
          onClick={() => {
            setSelectedCategoryName(category.name);
            setActiveTab("links");
          }}
        >
          <Link size={14} />
          <span>Manage Links</span>
        </button>
      </div>
      {categoriesStatus.find(status => status.categoryId === category.id)?.isFetchingArticles ? (
        categoriesStatus.find(status => status.categoryId === category.id)?.isFetchedAllArticles ? (
          <span className="text-sm text-gray-600">Re-fetching...</span>
        ) : (
          <RefreshCw size={14} />
        )
      ) : (
        <button
          className={`bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2 shadow-sm hover:shadow ${
            category.isFetchingNewArticles ? "opacity-50 hover:cursor-wait" : "hover:cursor-pointer"
          }`}
          disabled={category.isFetchingNewArticles}
          onClick={async () => {
            // Set isFetchingNewArticles to true for this category
            setCategories(
              categories.map(cat => (cat.id === category.id ? { ...cat, isFetchingNewArticles: true } : cat))
            );

            // Also set this as the currently fetching category
            setCategoriesFetching(category.id);

            // get custom links from category
            const customLinks = category.links.map(link => link.url.trim());

            console.log("Custom Links:", customLinks);
            console.log("_------------------------_");
            await fetchNewsForCategory(category.id, customLinks, categories);

            // Reset the categoriesFetching state when done
            setCategoriesFetching(null);
          }}
        >
          {category.isFetchingNewArticles ? (
            <Loader size={14} className="animate-spin text-white" />
          ) : (
            <RefreshCw size={14} />
          )}
          <span key={category.id} ref={refFetchNews}>
            {category.isFetchingNewArticles ? "Fetching" : "Fetch News"}
          </span>
        </button>
      )}
    </div>
  );
};

export default CategoryActionButtons;
