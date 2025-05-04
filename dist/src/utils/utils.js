import axios from "axios";
// Helper function to extract the summary from markdown JSON
// Function helpers
// Fetch categories, search terms, and links from API
// Fetch categories, search terms, and links from API
export const fetchCategories = async (setCategories) => {
    try {
        const response = await axios.get("/api/categories/categories");
        const fetchedCategories = response.data.categories.map(cat => {
            // Use a Map to store unique links
            const uniqueLinks = new Map();
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
                articles: cat.articles || [], // Fixed typo: Articles -> articles (assuming lowercase is correct)
                summary: "",
                articleFetchProgressProps: {
                    totalArticles: 0,
                    fetchedCount: 0,
                    errorCount: 0,
                    currentArticle: null,
                    isActive: false,
                },
            };
        });
        console.log("Fetched categories:", fetchedCategories);
        setCategories(fetchedCategories);
    }
    catch (error) {
        console.error("Error fetching categories:", error);
        throw error; // Re-throw the error so the caller can handle it
    }
};
