// pages/index.js
import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, X, ExternalLink } from "lucide-react";
import axios from "axios";

// import fetchCategories from utils.ts
import { fetchCategories } from "../utils/utils";

// import types Category and Article from utils.ts
import { Category, Article } from "../utils/utils";
// import loader icon for loading states
import { useEffect } from "react";
import { sampleCategory } from "@/utils/sampleCategory";
import { Loader } from "lucide-react";
import { Trash2, RefreshCw, Link, Globe } from "lucide-react";
import { toast } from "react-toastify";

import CategoryManager from "@/components/CategoryManager";
import LinkList from "@/components/LinkList";

import useCategoriesManager from "@/hooks/useCategoriesManager";
import CategoryComponent from "../components/CategoryComponent";

export default function NewsAggregator() {
  // Declare a state variable called categories and set it to an empty array of Category objects
  const [categories, setCategories] = useState<Category[]>([]);

  // State for new category form
  const [newCategoryName, setNewCategoryName] = useState("");
  // const [newSearchTerm, setNewSearchTerm] = useState("");
  // const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  // this will be used to track if the user is adding a new category and show a loading spinner

  // // Fetch categories and search terms from API
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const refFetchNews = useRef<HTMLSpanElement>(null);
  // declare which category is is being fetching
  const [categoriesFetching, setCategoriesFetching] = useState<number | null>(null);

  const [isFetchingAllNewsByButton, setIsFetchingAllNewsByButton] = useState<boolean>(false);

  // create a useState that will track the each category that is being fetched, ti should have categoryId and isFetchedAllArticles, isFetchingArticles, and it will be updated as long as there is a new category that is being fetched
  const [categoriesStatus, setCategoriesStatus] = useState<
    Array<{
      categoryId: number;
      isFetchingArticles: boolean;
      isFetchedAllArticles: boolean;
    }>
  >([]);

  const { isLoading } = useCategoriesManager({
    categories,
    setCategories,
    fetchCategoriesFunction: fetchCategories,
    sampleData: sampleCategory,
    isTestMode: false, // Set to true for testing, false for production
  });

  // create a useEffect that will be run one time when i get the list of categories, and it will set the categoriesStatus array with the categories that are being fetched
  useEffect(() => {
    // get the categories that are being fetched
    const categoriesBeingFetched = categories.filter(category =>
      category.articles.some(article => article.title === "")
    );
    // set the categoriesStatus array with the categories that are being fetched
    setCategoriesStatus(
      categoriesBeingFetched.map(category => ({
        categoryId: category.id,
        isFetchingArticles: true,
        isFetchedAllArticles: false,
      }))
    );
  }, [categories]);

  const [loadingSearchTermId, setLoadingSearchTermId] = useState<number | null>(null); // Track loading state

  const removeSearchTerm = async (categoryId: number, termIndex: number) => {
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) return;

    const searchTerm = category.searchTerms[termIndex];
    if (!searchTerm) return;

    setLoadingSearchTermId(termIndex); // Show loading indicator

    // Optimistic UI update: Remove the term locally first
    const updatedCategories = categories.map(cat => {
      if (cat.id === categoryId) {
        return {
          ...cat,
          searchTerms: cat.searchTerms.filter((_, index) => index !== termIndex),
        };
      }
      return cat;
    });
    setCategories(updatedCategories);

    try {
      // API Call to delete the term
      await axios.delete("/api/searchTerms/delete", {
        data: { searchTerm }, // Ensure your API expects this in the body
      });

      // Fetch updated categories from the API to sync with the database
      fetchCategories(setCategories);
    } catch (error) {
      console.error("Error deleting search term:", error);

      // Revert UI on error
      setCategories(categories);
    } finally {
      setLoadingSearchTermId(null); // Remove loading state
    }
  };

  // Toggle category table visibility
  interface ToggleCategoryTable {
    (categoryId: number): void;
  }

  // Function to toggle the category table
  const toggleCategoryTable: ToggleCategoryTable = categoryId => {
    // Map through the categories array
    setCategories(
      categories.map((category: Category) => {
        // If the category id matches the categoryId parameter, toggle its state
        // For all other categories, ensure they are closed (showTable: false)
        return {
          ...category,
          showTable: category.id === categoryId ? !category.showTable : false,
        };
      })
    );
  };

  // Toggle article selection

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

  // Simplified and more robust fetchNewsForCategory function
  const fetchNewsForCategory = async (
    categoryId: number,
    customLinks: string[] = [],
    currentCategories: Category[] = []
  ) => {
    // Get the category data
    const categoryData = currentCategories || categories;
    const category = categoryData.find(cat => cat.id === categoryId);

    if (!category) {
      console.error(`Category with ID ${categoryId} not found`);
      return [];
    }

    // Set loading state
    setCategories(prevCategories =>
      prevCategories.map(cat =>
        cat.id === categoryId ? { ...cat, isFetchingNewArticles: true, fetchedAllArticles: false } : cat
      )
    );

    // Log what we're doing to help with debugging
    console.log(`Fetching news for category: ${category.name}`);
    console.log(`Search terms: ${category.searchTerms.join(", ")}`);
    console.log(`Custom links: ${customLinks.length}`);

    try {
      // Prepare API request data
      const searchUrl =
        category.searchTerms.length > 0
          ? `https://www.google.co.uk/search?q=${encodeURIComponent(
              category.searchTerms.join(" OR ")
            )}&tbm=nws&tbs=qdr:w`
          : "";

      // Always use POST for consistency, regardless of parameters
      const response = await fetch("/api/category-article-links-scrapper", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          searchUrl: searchUrl || null,
          processSummaries: "true",
          urls: customLinks.length > 0 ? customLinks : [],
        }),
      });

      // Log the raw response for debugging
      console.log("API Response Status:", response.status);

      // Handle non-JSON responses
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text();
        console.error("Non-JSON response:", textResponse);
        throw new Error("API returned non-JSON response");
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API error:", errorData);
        throw new Error(errorData.error || "Failed to fetch news");
      }

      const data = await response.json();
      console.log(`Articles fetched for ${category.name}:`, data.articles);

      // Rest of your logic for processing articles...
      if (data.articles && data.articles.length > 0 && data.articles[0].title !== "") {
        setCategories(prevCategories => {
          return prevCategories.map(cat => {
            if (cat.id === categoryId) {
              return {
                ...cat,
                isFetchingNewArticles: false,
                fetchedAllArticles: true, // Assuming the API indicates all articles are fetched
                articles: [
                  ...cat.articles,
                  ...(data.articles.map((article: { id: number; title: string; summary: string; link: string }) => ({
                    ...article,
                    id: article.id.toString(),
                    summary: extractSummary(article.summary),
                    selected: false,
                  })) as Article[]),
                ],
              };
            }
            return cat;
          });
        });

        // Fix article IDs
        setCategories(prevCategories => {
          return prevCategories.map(cat => {
            if (cat.id === categoryId) {
              return {
                ...cat,
                articles: cat.articles.map((article, index) => ({
                  ...article,
                  id: index.toString(),
                })),
              };
            }
            return cat;
          });
        });

        return data.articles;
      } else {
        console.log("No articles found or empty response");
        setCategories(prevCategories => {
          return prevCategories.map(cat => {
            if (cat.id === categoryId) {
              return {
                ...cat,
                isFetchingNewArticles: false,
              };
            }
            return cat;
          });
        });
        return [];
      }
    } catch (error) {
      console.error("Error fetching news:", error);

      // Always reset loading state on error
      setCategories(prevCategories => {
        return prevCategories.map(cat => {
          if (cat.id === categoryId) {
            return {
              ...cat,
              isFetchingNewArticles: false,
            };
          }
          return cat;
        });
      });
      return [];
    }
  };

  // Function to fetch all news
  // Function to fetch all news
  const fetchAllNews = async () => {
    // Show initial feedback to user
    toast.info("Starting to fetch news for all categories...");
    setIsFetchingAllNewsByButton(true);

    // Create a local copy of category IDs to track which ones were originally open
    const openCategoryIds = new Set(categories.filter(cat => cat.showTable).map(cat => cat.id));

    // Create a copy of categories to track updates throughout the process
    let updatedCategories = [...categories];

    try {
      // Process each category sequentially
      for (let i = 0; i < updatedCategories.length; i++) {
        const category = updatedCategories[i];

        // Skip categories that are already being processed
        if (category.isFetchingNewArticles) {
          continue;
        }

        try {
          // Set the current category as being fetched - this will control which category is open
          setCategoriesFetching(category.id);

          // Update UI to show which category is being processed
          updatedCategories = updatedCategories.map(cat => ({
            ...cat,
            // Only open the current category being processed
            showTable: cat.id === category.id,
            // Set loading state only for this category
            isFetchingNewArticles: cat.id === category.id ? true : cat.isFetchingNewArticles,
          }));

          // Update React state to reflect changes
          setCategories(updatedCategories);

          // Update UI to show which category is being processed
          toast.info(`Fetching news for "${category.name}" (${i + 1}/${updatedCategories.length})`, {
            autoClose: 2000,
          });

          // Ensure the UI updates before proceeding
          await new Promise(resolve => setTimeout(resolve, 500));

          // Get custom links from the category
          const customLinks = category.links.map(link => link.url.trim());

          // Get the search terms for the category
          const searchTerms = category.searchTerms;

          try {
            let apiUrl = "/api/category-article-links-scrapper";
            let fetchOptions = {};

            // If we have search terms, create a Google search URL
            if (searchTerms.length > 0) {
              // Get the google news search URL
              const searchUrl = `https://www.google.co.uk/search?q=${encodeURIComponent(
                searchTerms.join(" OR ")
              )}&tbm=nws&tbs=qdr:w`;

              console.log("Generated search URL:", searchUrl);

              if (customLinks.length > 0) {
                // If we have both search terms and custom links, use POST with both
                fetchOptions = {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    searchUrl: searchUrl,
                    processSummaries: "true",
                    urls: customLinks,
                  }),
                };
              } else {
                // If we only have search terms, use GET
                const encodedUrl = encodeURIComponent(searchUrl);
                apiUrl = `${apiUrl}?url=${encodedUrl}&processSummaries=true`;
              }
            } else if (customLinks.length > 0) {
              // If we only have custom links, use POST with urls only
              fetchOptions = {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ urls: customLinks }),
              };
            }

            // Make the API request directly instead of using fetchNewsForCategory
            const response = await fetch(apiUrl, fetchOptions);

            // Check for non-JSON responses
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
              console.error("Received non-JSON response:", await response.text());
              throw new Error("API returned non-JSON response");
            }

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || "Failed to fetch news");
            }

            const data = await response.json();
            console.log(`Articles found for category ${category.name}:`, data.articles);

            // If we have articles, update our local copy of categories
            if (data.articles && data.articles.length > 0 && data.articles[0].title !== "") {
              // Find current category in our local copy
              const categoryIndex: number = updatedCategories.findIndex(cat => cat.id === category.id);

              if (categoryIndex !== -1) {
                // Process articles with proper format
                interface ArticleFromApi {
                  id: number;
                  title: string;
                  summary: string;
                  link: string;
                }

                const processedArticles = data.articles.map((article: ArticleFromApi, index: number) => ({
                  ...article,
                  id: index.toString(),
                  summary: extractSummary(article.summary),
                  selected: false,
                }));

                // Update the category with new articles
                updatedCategories[categoryIndex] = {
                  ...updatedCategories[categoryIndex],
                  articles: processedArticles,
                  isFetchingNewArticles: false,
                };

                // Update the React state with our updated local copy
                setCategories([...updatedCategories]);
              }
            } else {
              // Update loading state if no articles were found
              updatedCategories = updatedCategories.map(cat =>
                cat.id === category.id ? { ...cat, isFetchingNewArticles: false } : cat
              );
              setCategories([...updatedCategories]);
            }
          } catch (error) {
            console.error(`Error fetching news data for category "${category.name}":`, error);

            // Update loading state on error
            updatedCategories = updatedCategories.map(cat =>
              cat.id === category.id ? { ...cat, isFetchingNewArticles: false } : cat
            );
            setCategories([...updatedCategories]);
          }

          // Wait to ensure the UI reflects the fetched data
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Error processing category "${category.name}":`, error);
          toast.error(`Failed to fetch news for "${category.name}"`);

          // Reset loading state for this category in our local copy
          updatedCategories = updatedCategories.map(cat =>
            cat.id === category.id ? { ...cat, isFetchingNewArticles: false } : cat
          );

          // Update the React state with our updated local copy
          setCategories([...updatedCategories]);

          // Give user time to see the error
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // After all processing, restore original open/closed state
      const finalCategories = updatedCategories.map(cat => {
        return {
          ...cat, // This now includes all fetched articles
          showTable: openCategoryIds.has(cat.id), // Restore original open/closed state
          isFetchingNewArticles: false, // Reset loading state
        };
      });

      setCategories(finalCategories);

      // Reset the categoriesFetching state
      setCategoriesFetching(null);

      // set setIsFetchingAllNewsByButton to false
      setIsFetchingAllNewsByButton(false);

      toast.success("Completed fetching news for all categories");
    } catch (error) {
      console.error("Error in fetchAllNews:", error);
      toast.error("An error occurred while fetching news");

      // Reset the categoriesFetching state in case of error
      setCategoriesFetching(null);
    }
  };

  // Add this useEffect to help debug categoriesStatus changes
  useEffect(() => {
    // Log when categoriesStatus changes
    console.log("categoriesStatus changed:", categoriesStatus);

    // Store a copy in localStorage for debugging persistence
    if (categoriesStatus.length > 0) {
      localStorage.setItem("debug_categoriesStatus", JSON.stringify(categoriesStatus));
    }

    // If categoriesStatus becomes empty but we had previous values, investigate
    if (categoriesStatus.length === 0) {
      const previousStatus = localStorage.getItem("debug_categoriesStatus");
      if (previousStatus && JSON.parse(previousStatus).length > 0) {
        console.warn("categoriesStatus was reset to empty array! Previous value:", JSON.parse(previousStatus));
      }
    }
  }, [categoriesStatus]);

  // Function to summarize selected articles

  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);

  /**
   * Deletes a category and handles loading state using axios
   * @param categoryId The ID of the category to delete
   * @param e The click event
   */
  const handleDeleteCategory = async (categoryId: string, e: React.MouseEvent) => {
    // Prevent event bubbling to parent elements
    e.stopPropagation();

    // Set loading state
    setDeletingCategoryId(categoryId);

    try {
      await axios.delete("/api/categories/delete", {
        data: { categoryId },
      });

      // Handle successful deletion - update your state to remove the category
      setCategories(prevCategories => prevCategories.filter(category => category.id !== Number(categoryId)));

      // You might want to show a success toast/notification here
      toast.success("Category deleted successfully");
    } catch (error) {
      console.error("Error deleting category:", error);

      // Show error notification with appropriate message
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error || "Failed to delete category";
        toast.error(errorMessage);
      } else {
        toast.error("Failed to delete category");
      }
    } finally {
      // Clear loading state
      setDeletingCategoryId(null);
    }
  };

  interface RefetchArticlesParams {
    categoryId: number;
  }

  interface ArticleToFetch {
    link: string;
  }

  interface FetchArticlesResponse {
    results: Array<{
      url: string;
      title: string;
      summary: string;
    }>;
  }

  const refetchArticles = useCallback(
    async ({ categoryId }: RefetchArticlesParams): Promise<void> => {
      const category = categories.find(cat => cat.id === categoryId);

      if (!category) {
        console.error(`Category with ID ${categoryId} not found`);
        return;
      }

      // Get articles with empty titles or summaries (these need fetching)
      const articlesToFetch: ArticleToFetch[] = category.articles.filter(
        article => article.title === "" || article.summary === ""
      );

      // Early return if no articles need fetching
      if (articlesToFetch.length === 0) {
        console.log("All articles are already fetched for this category");

        // Update states once
        const categoriesUpdates = categories.map(cat =>
          cat.id === categoryId ? { ...cat, isFetchingNewArticles: false } : cat
        );

        const statusUpdates = categoriesStatus.map(status =>
          status.categoryId === categoryId
            ? { ...status, isFetchingArticles: false, isFetchedAllArticles: true }
            : status
        );

        // Batch state updates to reduce re-renders
        setCategories(categoriesUpdates);
        setTimeout(() => {
          setCategoriesStatus(statusUpdates);
        }, 0);

        return;
      }

      // Get the links to the articles that need fetching
      const linksToFetch = articlesToFetch.map(article => article.link);
      console.log(`Fetching ${linksToFetch.length} articles for category ${category.name}`);

      try {
        // Call API to fetch titles and summaries
        const response = await axios.post<FetchArticlesResponse>("/api/title-summaries-by-links", {
          links: linksToFetch,
          maxConcurrent: 5,
          maxWords: 100,
        });

        const data = response.data;

        // Update the articles with the fetched data
        const updatedArticles = category.articles.map(article => {
          if (article.title === "" || article.summary === "") {
            // Find the matching result from our API
            const matchingResult = data.results.find(result => result.url === article.link);

            if (matchingResult) {
              return {
                ...article,
                title: matchingResult.title || "",
                summary: matchingResult.summary || "",
              };
            }
          }
          return article;
        });

        // Prepare updates for both states
        const categoriesUpdates = categories.map(cat =>
          cat.id === categoryId ? { ...cat, articles: updatedArticles, isFetchingNewArticles: false } : cat
        );

        const statusUpdates = categoriesStatus.map(status =>
          status.categoryId === categoryId
            ? { ...status, isFetchingArticles: false, isFetchedAllArticles: true }
            : status
        );

        // Batch state updates to reduce re-renders
        setCategories(categoriesUpdates);
        setTimeout(() => {
          setCategoriesStatus(statusUpdates);
        }, 0);

        // set isFetchedAllArticles to true for this category
        setCategoriesStatus(prevStatus => {
          return prevStatus.map(status =>
            status.categoryId === categoryId
              ? { ...status, isFetchingArticles: false, isFetchedAllArticles: true }
              : status
          );
        });

        // Update the refFetchNews button text if it exists
        if (refFetchNews.current) {
          refFetchNews.current.innerText = "Fetched";
        }
      } catch (error) {
        console.error("Error fetching article details:", error);

        // Prepare updates for both states
        const categoriesUpdates = categories.map(cat =>
          cat.id === categoryId ? { ...cat, isFetchingNewArticles: false } : cat
        );

        const statusUpdates = categoriesStatus.map(status =>
          status.categoryId === categoryId
            ? { ...status, isFetchingArticles: false, isFetchedAllArticles: true }
            : status
        );

        // Batch state updates to reduce re-renders
        setCategories(categoriesUpdates);
        setTimeout(() => {
          setCategoriesStatus(statusUpdates);
        }, 0);
      }
    },
    [categories, categoriesStatus, setCategoriesStatus, setCategories, refFetchNews]
  );

  // create a useEffect that will track whenever isFetchingArticles is true, for a category, and if it it is true, it will perform a refetchArticles for that category if only is FetchedAllArticles is false
  useEffect(() => {
    const shouldFetchArticles = categoriesStatus.some(
      status => status.isFetchingArticles && !status.isFetchedAllArticles
    );

    if (!shouldFetchArticles) {
      return; // Early return if nothing to fetch
    }

    let isCurrentlyFetching = false;

    const fetchArticles = async () => {
      if (isCurrentlyFetching) return;

      isCurrentlyFetching = true;

      // Find the first category that needs refetching
      const categoryStatusToFetch = categoriesStatus.find(
        status => status.isFetchingArticles && !status.isFetchedAllArticles
      );

      if (categoryStatusToFetch) {
        const categoryToFetch = categories.find(cat => cat.id === categoryStatusToFetch.categoryId);

        if (categoryToFetch) {
          console.log(`Refetching articles for category: ${categoryToFetch.name}`);
          await refetchArticles({ categoryId: categoryToFetch.id });
        }
      }

      isCurrentlyFetching = false;
    };

    fetchArticles();
  }, [categories, categoriesStatus, refetchArticles]);

  // create a useEffect that will track when a link has been added to a category, so then it will added to the article array of the category, so the article array if have no article, then it will have a new article with id 1 and empty title, summary, but with the link added from the category links array, it should only run when a new link is added to a category
  // Modify the useEffect that adds links to articles
  useEffect(() => {
    const addLinkToArticles = () => {
      const category = categories.find(cat => cat.id === selectedCategoryId);
      if (category && category.links.length > 0) {
        const newArticles = category.links.map((link, index) => ({
          id: (index + 1).toString(),
          title: "",
          summary: "",
          link: link.url,
          selected: false,
        }));

        setCategories(categories.map(cat => (cat.id === selectedCategoryId ? { ...cat, articles: newArticles } : cat)));

        // Mark this category for fetching by updating categoriesStatus
        if (selectedCategoryId !== null) {
          setCategoriesStatus(prevStatus => {
            // Check if this category already exists in the status array
            const existingStatus = prevStatus.find(status => status.categoryId === selectedCategoryId);

            if (existingStatus) {
              // Update the existing entry
              return prevStatus.map(status =>
                status.categoryId === selectedCategoryId
                  ? { ...status, isFetchingArticles: true, isFetchedAllArticles: false }
                  : status
              );
            } else {
              // Add a new entry for this category
              return [
                ...prevStatus,
                {
                  categoryId: selectedCategoryId,
                  isFetchingArticles: true,
                  isFetchedAllArticles: false,
                },
              ];
            }
          });
        }
      }
    };

    addLinkToArticles();
  }, [selectedCategoryId, categories]);

  // print categories
  console.log("categories :", categories);

  // print is loading
  console.log("isLoading :", isLoading);
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left sidebar with categories */}
      <div className="w-1/3 bg-white shadow-md flex flex-col h-full">
        <div className="p-4 border-b border-gray-200 bg-white">
          <h1 className="text-2xl font-bold text-gray-800">News Aggregator</h1>
        </div>

        {/* Categories container with scroll */}
        <div className="flex-grow overflow-y-auto pb-20 pl-3 pr-3 pt-3">
          {/* // add Loading UI effect by checking isLoading */}
          {isLoading && (
            // add a div that will be shown when the categories been fetching, use isLoading to check that and update UI perfectly
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
          )}

          {categories.map(category => (
            <div
              key={category.id}
              className="border rounded-md border-gray-300 mb-4 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 bg-white"
            >
              <motion.div
                className="p-5 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                onClick={() => {
                  toggleCategoryTable(category.id);
                  setActiveTab(null);
                  setSelectedCategoryName(category.name);
                }}
              >
                <div className="flex items-center space-x-3">
                  <h2 className="text-lg font-semibold text-gray-800">{category.name}</h2>
                  <div className="flex space-x-2">
                    <span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full">
                      {category.searchTerms.length} terms
                    </span>
                    {category.links && (
                      <span className="bg-purple-100 text-purple-600 text-xs px-2 py-1 rounded-full">
                        {category.links.length} links
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <a
                    href={`https://www.google.co.uk/search?q=${encodeURIComponent(
                      category.searchTerms.join(" OR ")
                    )}&tbm=nws&tbs=qdr:w`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full text-gray-500 hover:bg-blue-50 hover:text-blue-500 transition-colors duration-200"
                    onClick={e => e.stopPropagation()}
                    title="Open in Google News"
                  >
                    <ExternalLink size={18} />
                  </a>
                  {/* add a checked icon if isFetchedAllArticles of categoriesStatus for this category is is true */}
                  {categoriesStatus.find(status => status.categoryId === category.id)?.isFetchedAllArticles && (
                    <span className="p-2 rounded-full text-green-500 bg-green-50">
                      <RefreshCw size={18} />
                    </span>
                  )}
                  <button
                    className="p-2 rounded-full text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors duration-200 hover:cursor-pointer"
                    onClick={e => handleDeleteCategory(category.id.toString(), e)}
                    disabled={deletingCategoryId === category.id.toString()}
                    title="Remove category"
                  >
                    {deletingCategoryId === category.id.toString() ? (
                      <Loader size={18} className="animate-spin text-red-500" />
                    ) : (
                      <Trash2 size={18} />
                    )}
                  </button>
                  <button
                    className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors duration-200"
                    onClick={e => {
                      e.stopPropagation();
                      if (category.showTable) {
                        toggleCategoryTable(category.id);
                      }
                    }}
                  >
                    {category.showTable ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
              </motion.div>

              <AnimatePresence>
                {(category.showTable || categoriesFetching === category.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="px-5 pb-5 pt-0 overflow-hidden"
                  >
                    {/* Search Terms Section */}
                    {category.searchTerms.length > 0 && (
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-2">
                          {category.searchTerms.map((term, index) => (
                            <div
                              key={index}
                              className="flex items-center bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full shadow-sm"
                            >
                              <span className="text-sm font-medium">{term}</span>
                              <button
                                className={`ml-1.5 rounded-full p-0.5 ${
                                  loadingSearchTermId === index
                                    ? "text-gray-400 cursor-not-allowed"
                                    : "text-blue-500 hover:text-red-500 hover:bg-blue-100 transition-colors duration-200 hover:cursor-pointer"
                                }`}
                                onClick={() => removeSearchTerm(category.id, index)}
                                disabled={loadingSearchTermId === index}
                              >
                                {loadingSearchTermId === index ? (
                                  <Loader size={14} className="animate-spin" />
                                ) : (
                                  <X size={14} />
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Links Section with Pagination */}
                    {category.links && category.links.length > 0 && (
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-sm font-medium text-gray-700">Saved Links</h3>
                        </div>

                        {/* Links Grid/List with conditional rendering based on number of links */}
                        {category.links.length <= 5 ? (
                          <LinkList
                            fetchCategories={fetchCategories}
                            category={category}
                            setCategories={setCategories}
                          />
                        ) : (
                          // Grid with pagination for many links
                          <div>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                              {category.links.slice(0, 6).map((link, index) => (
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
                                      <span className="text-sm text-gray-700 font-medium truncate">
                                        {link.title || "Untitled"}
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-500 truncate mt-1">{link.url}</p>
                                  </div>
                                  <button
                                    className="p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={e => {
                                      e.preventDefault();
                                      // Remove link function
                                    }}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </a>
                              ))}
                            </div>

                            {category.links.length > 6 && (
                              <div className="flex justify-between items-center text-sm text-gray-500">
                                <span>Showing 6 of {category.links.length} links</span>
                                <button
                                  onClick={() => {
                                    setSelectedCategoryName(category.name);
                                    setActiveTab("links");
                                    setSelectedCategoryId(category.id);
                                  }}
                                  className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:cursor-pointer"
                                >
                                  View all links
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-between items-center mt-4">
                      <div className="flex space-x-2">
                        <button
                          className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors duration-200 hover:cursor-pointer"
                          onClick={() => {
                            /* Add function to manage links */
                            setSelectedCategoryName(category.name);
                            setActiveTab("links");
                            // setSelectedCategoryId(category.id);
                          }}
                        >
                          <Link size={14} />
                          <span>Manage Links</span>
                        </button>
                      </div>
                      {categoriesStatus.find(status => status.categoryId === category.id)?.isFetchingArticles ? (
                        categoriesStatus.find(status => status.categoryId === category.id)?.isFetchedAllArticles ? (
                          <span className="text-sm text-gray-600">Re-fetching...</span>
                        ) : (
                          <RefreshCw size={14} />
                        )
                      ) : (
                        <button
                          className={`bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2 shadow-sm hover:shadow ${
                            category.isFetchingNewArticles ? "opacity-50 hover:cursor-wait" : "hover:cursor-pointer" // disable the button if isFetchingNewArticles is true
                          } 
                        `}
                          disabled={category.isFetchingNewArticles}
                          onClick={async () => {
                            // Set isFetchingNewArticles to true for this category
                            setCategories(
                              categories.map(cat =>
                                cat.id === category.id ? { ...cat, isFetchingNewArticles: true } : cat
                              )
                            );

                            // Also set this as the currently fetching category
                            setCategoriesFetching(category.id);

                            // get custom links from category
                            const customLinks = category.links.map(link => link.url.trim());

                            console.log("Custom Links:", customLinks);

                            await fetchNewsForCategory(category.id, customLinks);

                            // Reset the categoriesFetching state when done
                            setCategoriesFetching(null);
                          }}
                        >
                          {category.isFetchingNewArticles ? (
                            <Loader
                              size={14}
                              // add loading animation
                              className="animate-spin text-white"
                            />
                          ) : (
                            <RefreshCw size={14} />
                          )}
                          <span key={category.id} ref={refFetchNews}>
                            {category.isFetchingNewArticles ? "Fetching" : "Fetch News"}
                          </span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Fixed bottom section for "Fetch All News" button */}
        <div className="absolute bottom-0 left-0 w-1/3 p-4 bg-white border-t border-gray-200">
          <button
            className={`w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition shadow-md hover:cursor-pointer flex items-center justify-center gap-1
              ${isFetchingAllNewsByButton ? "opacity-50 hover:cursor-wait" : ""}
              `}
            onClick={() => {
              fetchAllNews();
            }}
            disabled={isFetchingAllNewsByButton}
          >
            {isFetchingAllNewsByButton ? (
              <RefreshCw className="animate-spin text-white" size={14} />
            ) : (
              <RefreshCw size={14} />
            )}
            <span key="fetch-all-news">{isFetchingAllNewsByButton ? "Fetching All News" : "Fetch All News"}</span>
          </button>
        </div>
      </div>

      {/* Right content area */}
      <div className="w-2/3 overflow-y-auto">
        {/* Add Category and Search Terms Form */}

        <CategoryManager
          newCategoryName={newCategoryName}
          setNewCategoryName={setNewCategoryName}
          setCategories={setCategories}
          fetchCategories={fetchCategories}
          setActiveTab={setActiveTab}
          activeTab={activeTab}
          selectedCategoryName={selectedCategoryName || ""}
          categories={categories}
        />

        {/* Articles Tables */}
        {categories.map(
          category =>
            category.showTable && (
              <CategoryComponent
                key={`table-${category.id}`}
                category={category}
                categories={categories}
                setCategories={setCategories}
              />
            )
        )}
      </div>
    </div>
  );
}
