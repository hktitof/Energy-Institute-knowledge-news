// components/LinkList.tsx

import React from "react";
import { Trash2, Globe } from "lucide-react";
import { Category } from "../utils/utils";

interface LinkListProps {
  category: Category;
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  fetchCategories: () => Promise<void>;
}

const LinkList: React.FC<LinkListProps> = ({ category, setCategories, fetchCategories }) => {
  // Function to remove a link from a category
  const removeLink = async (linkIndex: number) => {
    // This is a placeholder for the actual implementation
    // You would need to implement the actual API call to remove the link
    console.log(`Removing link at index ${linkIndex} from category ${category.id}`);

    // Optimistically update the UI
    setCategories(prevCategories =>
      prevCategories.map(cat => {
        if (cat.id === category.id) {
          const updatedLinks = [...cat.links];
          updatedLinks.splice(linkIndex, 1);
          return { ...cat, links: updatedLinks };
        }
        return cat;
      })
    );

    // Refresh data from the server
    await fetchCategories();
  };

  return (
    <div className="space-y-2">
      {category.links.map((link, index) => (
        <a
          key={index}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center p-2 rounded-md hover:bg-gray-50 border border-gray-100 group"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <Globe size={14} className="text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-700 font-medium truncate">{link.title || "Untitled"}</span>
            </div>
            <p className="text-xs text-gray-500 truncate mt-1">{link.url}</p>
          </div>
          <button
            className="p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={e => {
              e.preventDefault();
              removeLink(index);
            }}
          >
            <Trash2 size={14} />
          </button>
        </a>
      ))}
    </div>
  );
};

export default LinkList;
