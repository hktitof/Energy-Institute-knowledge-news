import axios from "axios";

// types
export type ApiCategory = {
  CategoryID: number;
  CategoryName: string;
  searchTerms: { SearchTermID: number; Term: string }[];
  links: { LinkID: number; URL: string; Title?: string | null }[];
};

export type Article = {
  id: string;
  title: string;
  summary: string;
  link: string;
  selected: boolean;
};

export interface Category {
  id: number;
  name: string;
  searchTerms: string[];
  articles: Article[];
  showTable: boolean;
  isFetchingNewArticles?: boolean;
  links: { id: number; url: string; title?: string }[];
}

// Helper function to extract the summary from markdown JSON
const extractSummary = (rawSummary: string): string => {
  if (rawSummary.startsWith("```json")) {
    // Remove the code fence and trim extra whitespace
    const cleaned = rawSummary.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    try {
      const parsed = JSON.parse(cleaned);
      return parsed.summary || rawSummary;
    } catch (error) {
      console.error("Error parsing summary JSON:", error);
      return rawSummary;
    }
  }
  return rawSummary;
};

// Function helpers

// Fetch categories, search terms, and links from API
export const fetchCategories = async (setCategories: React.Dispatch<React.SetStateAction<Category[]>>) => {
  axios
    .get<{ categories: ApiCategory[] }>("/api/categories/categories")
    .then(response => {
      const fetchedCategories = response.data.categories.map(cat => {
        // Use a Set to store unique links
        const uniqueLinks = new Map<number, { id: number; url: string; title?: string }>();

        cat.links.forEach(link => {
          if (!uniqueLinks.has(link.LinkID)) {
            uniqueLinks.set(link.LinkID, {
              id: link.LinkID,
              url: link.URL,
              title: link.Title || "", // Handle optional title
            });
          }
        });

        return {
          id: cat.CategoryID,
          name: cat.CategoryName,
          searchTerms: cat.searchTerms.map(term => term.Term),
          showTable: false, // always false on the client side
          articles: [], // empty for now
          links: Array.from(uniqueLinks.values()), // Convert the map back to an array
        };
      });

      // print fetched categories from API
      console.log("Fetched categories:", fetchedCategories);
      setCategories(fetchedCategories);
    })
    .catch(error => {
      console.error("Error fetching categories:", error);
    });
};


const handleDeleteLink = async (linkId: string) => {
    // If confirmation dialog is not shown yet, show it first
    if (showConfirmation !== linkId) {
      setShowConfirmation(linkId);
      return;
    }

    // If confirmed, proceed with deletion
    try {
      setDeletingIds(prev => [...prev, linkId]);

      const response = await fetch(`/api/links/delete?linkId=${linkId}`, {
        method: "DELETE",
      });

      // print response and mention that from the component name
      console.log("Response from handleDeleteLink: ", response);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete link");
      }

      // Success - clear confirmation state and refresh links
      setShowConfirmation(null);
      toast.success("Link deleted successfully");
      fetchCategories(setCategories);
    } catch (error: unknown) {
      console.error("Error deleting link:", error);
      if (error instanceof Error) {
        toast.error(error.message || "Error deleting link");
      } else {
        toast.error("Error deleting link");
      }
    } finally {
      setDeletingIds(prev => prev.filter(id => id !== linkId));
    }
  };
