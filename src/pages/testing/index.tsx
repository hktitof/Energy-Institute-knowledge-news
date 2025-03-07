// pages/test.tsx
import { useState } from "react";

type SearchTerm = {
  SearchTermID: number;
  Term: string;
};

type Category = {
  CategoryID: number;
  CategoryName: string;
  searchTerms: SearchTerm[];
};

const TestCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) {
        throw new Error("Failed to fetch categories");
      }
      const data = await res.json();
      setCategories(data.categories);
    } catch (err: Error | unknown) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // In dt.ts, add temporarily:
  console.log("Connecting with:", {
    server: process.env.AZURE_SQL_SERVER,
    database: process.env.AZURE_SQL_DATABASE,
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Test Categories</h1>
      <button
        onClick={fetchCategories}
        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded shadow transition-colors duration-200"
      >
        {loading ? "Loading..." : "Fetch Categories"}
      </button>
      {error && <p className="text-red-500 mt-4">{error}</p>}
      <div className="w-full max-w-2xl mt-6 space-y-4">
        {categories.map(cat => (
          <div key={cat.CategoryID} className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold text-gray-700">{cat.CategoryName}</h2>
            {cat.searchTerms.length > 0 && (
              <ul className="mt-2 list-disc list-inside">
                {cat.searchTerms.map(term => (
                  <li key={term.SearchTermID} className="text-gray-600">
                    {term.Term}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TestCategories;
