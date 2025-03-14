import React, { useState } from "react";

interface LinkFormProps {
  categoryId: string;
  categoryName: string;
  onLinkAdded: (link: { id: string; categoryId: string; url: string; title: string | null }) => void;
}

const LinkForm: React.FC<LinkFormProps> = ({ categoryId, categoryName, onLinkAdded }) => {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const validateUrl = url => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleSubmit = async e => {
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
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // print link form data that will be submitted to the api
  console.log({
    categoryId,
    categoryName,
    onLinkAdded,
  });

  return (
    <div className="bg-gray-50 p-4 rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-700 mb-4">Add New Link</h3>

      {error && <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}

      {success && <div className="mb-4 p-2 bg-green-100 border border-green-400 text-green-700 rounded">{success}</div>}

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

export default LinkForm;
