import React from "react";
import { Category } from "@/utils/utils";
import ArticlesTable from "./ArticlesTable";

interface SummarizeSelectedArticles {
  (categoryId: number): void;
}

interface CategoryForSummary {
  id: number;
  name: string;
  articles: Array<{ selected: boolean }>;
}
export default function CategoryComponent({
  category,
  categories,
  setCategories,
}: {
  category: Category;
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
}) {
  const summarizeSelectedArticles: SummarizeSelectedArticles = categoryId => {
    const category = categories.find((c: CategoryForSummary) => c.id === categoryId);
    if (!category) return;

    const selectedArticleCount = category.articles.filter(a => a.selected).length;
    console.log(`Summarizing ${selectedArticleCount} articles from category "${category.name}"`);
    // In a real app, this would call an API to summarize the articles
  };
  return (
    <div className="p-6 bg-white shadow-sm mb-1">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">{category.name} Articles</h2>
        <button
          onClick={() => summarizeSelectedArticles(category.id)}
          className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition hover:cursor-pointer"
        >
          Summarize Selected
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Select
              </th>
              <th scope="col" className=" py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Id
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Title
              </th>

              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Summary
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Link
              </th>
            </tr>
          </thead>

          <ArticlesTable categories={categories} category={category} setCategories={setCategories} />
        </table>
      </div>
    </div>
  );
}
