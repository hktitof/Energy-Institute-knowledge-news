import axios from "axios";

// types
export type ApiCategory = {
  CategoryID: number;
  CategoryName: string;
  searchTerms: { SearchTermID: number; Term: string }[];
  links: { LinkID: number; URL: string; Title?: string | null }[];
  articles: Article[];
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
  fetchedAllArticles?: boolean;
  summary: string;
  isSummaryFetching?: boolean;
  summaryMaxWords?: number;
}

// Helper function to extract the summary from markdown JSON

// Function helpers

// Fetch categories, search terms, and links from API
// Fetch categories, search terms, and links from API
export const fetchCategories = async (setCategories: React.Dispatch<React.SetStateAction<Category[]>>) => {
  axios
    .get<{ categories: ApiCategory[] }>("/api/categories/categories")
    .then(response => {
      const fetchedCategories = response.data.categories.map(cat => {
        // Use a Map to store unique links
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
          links: Array.from(uniqueLinks.values()), // Convert the map back to an array
          articles: cat.articles || [],
          summary: "",
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
