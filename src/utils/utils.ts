import axios from "axios";

// types
export type ApiCategory = {
  CategoryID: number;
  CategoryName: string;
  searchTerms: { SearchTermID: number; Term: string }[];
};

export type Article = {
  id: string;
  title: string;
  content: string;
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
  links?: { url: string; title?: string }[];
}

//  Function helpers

// Fetch categories and search terms from API
export const fetchCategories = async (
  // add setCategories to the function signature
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>
) => {
  axios
    .get<{ categories: ApiCategory[] }>("/api/categories/categories")
    .then(response => {
      const fetchedCategories = response.data.categories.map(cat => ({
        id: cat.CategoryID,
        name: cat.CategoryName,
        searchTerms: cat.searchTerms.map(term => term.Term),
        showTable: false, // always false on the client side
        articles: [], // empty for now
      }));
      setCategories(fetchedCategories);
    })
    .catch(error => {
      console.error("Error fetching categories:", error);
    });
};
