import { useState } from "react";
import axios from "axios";
import { Plus } from "react-feather"; // adjust import based on your icon library
interface Category {
  id: number;
  name: string;
  searchTerms: string[];
  showTable: boolean;
  articles: DummyArticle[];
}
interface DummyArticle {
  id: string;
  title: string;
  content: string;
  summary: string;
  link: string;
  selected: boolean;
}
const SearchTermAdder = ({
  categories,
  fetchCategories,
  setCategories,
}: {
  categories: Category[];
  fetchCategories: (setCategories: React.Dispatch<React.SetStateAction<Category[]>>) => void;
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
}) => {
  const [newSearchTerm, setNewSearchTerm] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [addingSearchTerm, setAddingSearchTerm] = useState(false);

  const addSearchTerm = async () => {
    if (newSearchTerm.trim() === "" || !selectedCategoryId) return;
    setAddingSearchTerm(true);
    try {
      const response = await axios.post("/api/searchTerms/add", {
        categoryId: selectedCategoryId,
        searchTerm: newSearchTerm,
      });
      console.log("Search term added:", response.data);
      setNewSearchTerm("");
      // Re-fetch the updated categories from the API
      await fetchCategories(setCategories);
    } catch (error) {
      console.error("Error adding search term:", error);
    } finally {
      setAddingSearchTerm(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Add Search Term</label>
      <div className="flex">
        <select
          value={selectedCategoryId || ""}
          onChange={e => setSelectedCategoryId(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mr-2"
        >
          <option value="">Select Category</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={newSearchTerm}
          onChange={e => setNewSearchTerm(e.target.value)}
          className="flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search term"
        />
        <button
          onClick={addSearchTerm}
          disabled={addingSearchTerm}
          className={`ml-2 bg-blue-600 text-white p-2 rounded-md transition-colors duration-200 ${
            addingSearchTerm ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-700"
          }`}
        >
          {addingSearchTerm ? "Adding..." : <Plus size={20} />}
        </button>
      </div>
    </div>
  );
};

export default SearchTermAdder;
