import React, { useState, useEffect } from "react";
import { Trash2, Check, X, Loader } from "lucide-react";

// Link interfaces
interface Link {
  id: number;
  url: string;
  title: string | null;
}

interface LinkFormProps {
  categoryId: string;
  categoryName: string;
  onLinkAdded: (link: { id: string | number; categoryId: string; url: string; title: string | null }) => void;
  updateCategories: () => Promise<void>;
}

interface LinksManagerProps {
  links: Link[];
  categoryId: string;
  categoryName: string;
  onLinksUpdated: () => void;
  updateCategories: () => Promise<void>;
}

// LinkForm Component
const LinkForm: React.FC<LinkFormProps> = ({ categoryId, categoryName, onLinkAdded, updateCategories }) => {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess("");
      }, 3000); // 3000 milliseconds = 3 seconds
      return () => clearTimeout(timer); // Cleanup timer if success changes or component unmounts
    }
  }, [success]);

  const validateUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch (e: unknown) {
      console.error("Invalid URL:", e);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Form validation
    if (!url) {
      setError("Please enter a URL");
      return;
    }

    if (!validateUrl(url)) {
      setError("Please enter a valid URL");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/links/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categoryId,
          link: url,
          title: title || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add link");
      }

      // Reset form
      setUrl("");
      setTitle("");
      setSuccess("Link added successfully!");

      // Call the callback function with the new link data
      if (onLinkAdded && typeof onLinkAdded === "function") {
        onLinkAdded({
          id: data.linkId,
          categoryId,
          url,
          title,
        });
      }
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      updateCategories();
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg shadow mb-6">
      <h3 className="text-lg font-medium text-gray-700 mb-4">Add New Link</h3>

      {error && <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}

      {success.length > 0 && (
        <div className="mb-4 p-2 bg-green-100 border border-green-400 text-green-700 rounded">{success}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="w-full md:w-1/4 lg:w-1/5">
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <div className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 text-gray-700">
              {categoryName}
            </div>
          </div>

          <div className="w-full md:w-1/3 lg:w-2/5">
            <label className="block text-sm font-medium text-gray-700 mb-1">Link URL</label>
            <input
              type="url"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com"
              value={url}
              onChange={e => setUrl(e.target.value)}
              required
            />
          </div>

          <div className="w-full md:w-1/4 lg:w-1/5">
            <label className="block text-sm font-medium text-gray-700 mb-1">Link Title (Optional)</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter title"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div className="md:flex-grow">
            <button
              type="submit"
              className={`w-full font-medium py-2 px-4 rounded-md transition-colors ${
                isLoading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
              disabled={isLoading}
            >
              {isLoading ? "Adding..." : "Add Link"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

// LinksManager Component
const LinksManager: React.FC<LinksManagerProps> = ({ links, categoryName, onLinksUpdated, updateCategories }) => {
  const [selectedLinks, setSelectedLinks] = useState<number[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<{ success: boolean; message: string } | null>(null);

  // add a useEffect that will change deleteStatus.success to false after 5 seconds
  useEffect(() => {
    if (deleteStatus?.success) {
      const timer = setTimeout(() => {
        setDeleteStatus(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [deleteStatus]);

  const handleSelectAll = () => {
    if (selectedLinks.length === links.length) {
      // If all are selected, unselect all
      setSelectedLinks([]);
    } else {
      // Otherwise select all links
      setSelectedLinks(links.map(link => link.id));
    }
  };

  const handleCheckboxChange = (linkId: number) => {
    setSelectedLinks(prev => (prev.includes(linkId) ? prev.filter(id => id !== linkId) : [...prev, linkId]));
  };

  const handleDeleteSelected = async () => {
    if (selectedLinks.length === 0) return;

    setIsDeleting(true);
    setDeleteStatus(null);

    try {
      const response = await fetch("/api/links/bulk-delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          linkIds: selectedLinks,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete links");
      }

      setDeleteStatus({
        success: true,
        message: `Successfully deleted ${selectedLinks.length} link(s)`,
      });

      // update categories state by calling updateCategories function
      if (updateCategories && typeof updateCategories === "function") {
        updateCategories();
      }

      // Clear selections
      setSelectedLinks([]);

      // Notify parent component to refresh the links
      if (onLinksUpdated && typeof onLinksUpdated === "function") {
        onLinksUpdated();
      }
    } catch (error) {
      setDeleteStatus({
        success: false,
        message: (error as Error).message,
      });
    } finally {
      setIsDeleting(false);

      // Auto-hide success message after 3 seconds
      if (deleteStatus?.success) {
        setTimeout(() => {
          setDeleteStatus(null);
        }, 3000);
      }
    }
  };

  const clearStatus = () => {
    setDeleteStatus(null);
  };

  // Handle the case where links might not be defined
  const linksArray = Array.isArray(links) ? links : [];

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-800">
          Links in &quot;{categoryName}&quot; <span className="text-sm text-gray-500">({linksArray.length})</span>
        </h2>

        <div className="flex items-center">
          {selectedLinks.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isDeleting ? "bg-red-100 text-red-400 cursor-not-allowed" : "bg-red-600 text-white hover:bg-red-700"
              }`}
            >
              {isDeleting ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete ({selectedLinks.length})
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {deleteStatus && (
        <div
          className={`p-3 flex items-center justify-between ${
            deleteStatus.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          }`}
        >
          <div className="flex items-center">
            {deleteStatus.success ? (
              <Check className="h-5 w-5 mr-2 text-green-500" />
            ) : (
              <X className="h-5 w-5 mr-2 text-red-500" />
            )}
            <span>{deleteStatus.message}</span>
          </div>
          <button onClick={clearStatus} className="focus:outline-none">
            <X className="h-5 w-5 text-gray-500 hover:text-gray-700" />
          </button>
        </div>
      )}

      {linksArray.length === 0 ? (
        <div className="p-8 text-center text-gray-500">No links available in this category</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12"
                >
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={selectedLinks.length === linksArray.length && linksArray.length > 0}
                      onChange={handleSelectAll}
                      aria-label="Select all links"
                    />
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Title/URL
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {linksArray.map(link => (
                <tr key={link.id} className={selectedLinks.includes(link.id) ? "bg-blue-50" : "hover:bg-gray-50"}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={selectedLinks.includes(link.id)}
                      onChange={() => handleCheckboxChange(link.id)}
                      aria-label={`Select link ${link.title || link.url}`}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      {link.title && <span className="text-sm font-medium text-gray-900">{link.title}</span>}
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline truncate max-w-md"
                      >
                        {link.url}
                      </a>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleCheckboxChange(link.id)}
                      className="text-red-600 hover:text-red-900 focus:outline-none"
                      aria-label={`Delete link ${link.title || link.url}`}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Combined component
const CategoryLinksManager: React.FC<{
  categoryId: string;
  categoryName: string;
  links: Link[];
  updateCategories: () => Promise<void>;
}> = ({ categoryId, categoryName, links, updateCategories }) => {
  const [linksData, setLinksData] = useState<Link[]>(links || []);

  const handleLinkAdded = (newLink: { id: string | number; categoryId: string; url: string; title: string | null }) => {
    // Convert the ID to a number if it's a string
    const linkWithNumberId = {
      ...newLink,
      id: typeof newLink.id === "string" ? parseInt(newLink.id, 10) : newLink.id,
    };

    setLinksData(prev => [...prev, linkWithNumberId as Link]);
  };

  const refreshLinks = async () => {
    // You can implement your fetch logic here if needed
    // For now, we'll just update the state by removing deleted links
    setLinksData(prev => prev.filter(link => !selectedLinks.includes(link.id)));
  };

  // Keep track of selected links for refreshing
  const [selectedLinks] = useState<number[]>([]);

  useEffect(() => {
    // Update links when the props change
    setLinksData(links || []);
  }, [links]);

  return (
    <div className="space-y-6">
      <LinkForm
        categoryId={categoryId}
        categoryName={categoryName}
        onLinkAdded={handleLinkAdded}
        updateCategories={updateCategories}
      />
      <LinksManager
        links={linksData}
        categoryId={categoryId}
        categoryName={categoryName}
        onLinksUpdated={refreshLinks}
        updateCategories={updateCategories}
      />
    </div>
  );
};

export { CategoryLinksManager, LinkForm, LinksManager };
export default CategoryLinksManager;
