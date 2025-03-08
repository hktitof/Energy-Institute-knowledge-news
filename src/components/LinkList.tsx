import { useState } from "react";
import { Globe, Trash2, AlertCircle } from "lucide-react";
import { toast } from "react-hot-toast"; // Assuming you're using react-hot-toast for notifications
import { Category } from "../utils/utils";
const LinksList = ({
  category,
  setCategories,
  fetchCategories,
}: {
  category: Category;
  fetchCategories: (setCategories: React.Dispatch<React.SetStateAction<Category[]>>) => Promise<void>;
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
}) => {
  const [deletingLinkIds, setDeletingLinkIds] = useState(new Set());

  interface HandleDeleteLink {
    (e: React.MouseEvent<HTMLButtonElement>, linkId: string | number | undefined): Promise<void>;
  }

  const handleDeleteLink: HandleDeleteLink = async (e, linkId) => {
    e.preventDefault();
    e.stopPropagation();

    if (!linkId) {
      toast.error("Cannot delete link: Missing link ID");
      return;
    }

    // Add the link ID to the set of deleting links
    setDeletingLinkIds(prev => new Set(prev).add(linkId));

    try {
      const response = await fetch(`/api/links/delete?linkId=${linkId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete link");
      }

      // Success! Show toast and refresh data
      toast.success("Link deleted successfully");

      // Refresh data if a refresh function was provided
      if (fetchCategories) {
        fetchCategories(setCategories);
      }
    } catch (error) {
      console.error("Error deleting link:", error);
      if (error instanceof Error) {
        toast.error(`Error deleting link: ${error.message}`);
      } else {
        toast.error("Error deleting link: Unknown error");
      }
    } finally {
      // Remove the link ID from the set of deleting links
      setDeletingLinkIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(linkId);
        return newSet;
      });
    }
  };

  return (
    <div className="space-y-2">
      {category.links.slice(0, 5).map((link, index) => (
        <a
          key={index}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 group transition-all duration-200"
        >
          <div className="flex items-center space-x-2 overflow-hidden max-w-[85%]">
            <Globe size={16} className="text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-700 truncate font-medium">{link.title || link.url}</span>
          </div>
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              className="p-1.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors duration-200"
              onClick={e => handleDeleteLink(e, link.id)}
              disabled={deletingLinkIds.has(link.id)}
              aria-label="Delete link"
            >
              {deletingLinkIds.has(link.id) ? (
                <div className="animate-spin h-3.5 w-3.5 border-2 border-red-500 border-t-transparent rounded-full" />
              ) : (
                <Trash2 size={14} />
              )}
            </button>
          </div>
        </a>
      ))}

      {category.links.length === 0 && (
        <div className="flex items-center justify-center p-4 text-gray-400 text-sm">
          <AlertCircle size={16} className="mr-2" />
          No links in this category
        </div>
      )}
    </div>
  );
};

export default LinksList;
