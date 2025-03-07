import React from "react";
import axios from "axios";
import { Plus } from "react-feather";
import { Category } from "../utils/utils";
export default function CategoryAdder({
  newCategoryName,
  setNewCategoryName,
  setAdding,
  adding,
  fetchCategories,
  setCategories,
}: {
  newCategoryName: string;
  setNewCategoryName: (name: string) => void;
  adding: boolean;
  setAdding: (adding: boolean) => void;
  fetchCategories: (setCategories: React.Dispatch<React.SetStateAction<Category[]>>) => void;
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
}) {
  const addCategory = async () => {
    if (newCategoryName.trim() === "") return;
    setAdding(true);
    try {
      const response = await axios.post("/api/categories/add", { categoryName: newCategoryName });
      console.log("Category added:", response.data);
      setNewCategoryName("");
      // After successfully adding, fetch the updated list
      await fetchCategories(setCategories);
    } catch (error) {
      console.error("Error adding category:", error);
    } finally {
      setAdding(false);
    }
  };
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">New Category</label>
      <div className="flex">
        <input
          type="text"
          value={newCategoryName}
          onChange={e => setNewCategoryName(e.target.value)}
          className="flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Category name"
        />
        <button
          onClick={addCategory}
          disabled={adding}
          className={`ml-2 bg-green-600 text-white p-2 rounded-md transition-colors duration-200 ${
            adding ? "opacity-50 cursor-not-allowed" : "hover:bg-green-700"
          }`}
        >
          {adding ? "Adding..." : <Plus size={20} />}
        </button>
      </div>
    </div>
  );
}
