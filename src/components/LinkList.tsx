// components/LinkList.tsx

import React from "react";
import { Globe } from "lucide-react";
import { Category } from "../utils/utils";

interface LinkListProps {
  category: Category;
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  fetchCategories: () => Promise<void>;
}

const LinkList: React.FC<LinkListProps> = ({ category }) => {
  // Function to remove a link from a category

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
              <span className="text-xs text-gray-700 font-medium truncate">{link.title || "Untitled"}</span>
            </div>
            <p className="text-xs text-gray-500 truncate mt-1">{link.url}</p>
          </div>
        </a>
      ))}
    </div>
  );
};

export default LinkList;
