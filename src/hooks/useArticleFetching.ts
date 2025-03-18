import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Category, Article } from "../utils/utils";

interface CategoryStatus {
  categoryId: number;
  isFetchingArticles: boolean;
  isFetchedAllArticles: boolean;
}

export const useArticleFetching = (
  categories: Category[],
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>
) => {
  const [categoriesFetching, setCategoriesFetching] = useState<number | null>(null);
  const [isFetchingAllNewsByButton, setIsFetchingAllNewsByButton] = useState<boolean>(false);
  const [categoriesStatus, setCategoriesStatus] = useState<CategoryStatus[]>([]);
  const refFetchNews = useRef<HTMLSpanElement>(null);

  // Initialize categoriesStatus based on categories
  useEffect(() => {
    const categoriesBeingFetched = categories.filter(category =>
      category.articles.some(article => article.title === "")
    );

    setCategoriesStatus(
      categoriesBeingFetched.map(category => ({
        categoryId: category.id,
        isFetchingArticles: true,
        isFetchedAllArticles: false,
      }))
    );
  }, [categories]);

  // Debug logging for categoriesStatus
  useEffect(() => {
    console.log("categoriesStatus changed:", categoriesStatus);

    if (categoriesStatus.length > 0) {
      localStorage.setItem("debug_categoriesStatus", JSON.stringify(categoriesStatus));
    }

    if (categoriesStatus.length === 0) {
      const previousStatus = localStorage.getItem("debug_categoriesStatus");
      if (previousStatus && JSON.parse(previousStatus).length > 0) {
        console.warn("categoriesStatus was reset to empty array! Previous value:", JSON.parse(previousStatus));
      }
    }
  }, [categoriesStatus]);

  // Extract summary from raw text
  const extractSummary = (rawSummary: string): string => {
    if (rawSummary.startsWith("```json")) {
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

  // Fetch news for a single category
  const fetchNewsForCategory = async (
    categoryId: number,
    customLinks: string[] = [],
    currentCategories: Category[] = []
  ) => {
    const categoryData = currentCategories.length ? currentCategories : categories;
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

    console.log(`Fetching news for category: ${category.name}`);
    console.log(`Search terms: ${category.searchTerms.join(", ")}`);
    console.log(`Custom links: ${customLinks.length}`);

    try {
      const searchUrl =
        category.searchTerms.length > 0
          ? `https://www.google.co.uk/search?q=${encodeURIComponent(
              category.searchTerms.join(" OR ")
            )}&tbm=nws&tbs=qdr:w`
          : "";

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

      console.log("API Response Status:", response.status);

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

      if (data.articles && data.articles.length > 0 && data.articles[0].title !== "") {
        setCategories(prevCategories => {
          return prevCategories.map(cat => {
            if (cat.id === categoryId) {
              return {
                ...cat,
                isFetchingNewArticles: false,
                fetchedAllArticles: true,
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

  // Fetch news for all categories
  const fetchAllNews = async () => {
    toast.info("Starting to fetch news for all categories...");
    setIsFetchingAllNewsByButton(true);

    const openCategoryIds = new Set(categories.filter(cat => cat.showTable).map(cat => cat.id));
    let updatedCategories = [...categories];

    try {
      for (let i = 0; i < updatedCategories.length; i++) {
        const category = updatedCategories[i];

        if (category.isFetchingNewArticles) {
          continue;
        }

        try {
          setCategoriesFetching(category.id);

          updatedCategories = updatedCategories.map(cat => ({
            ...cat,
            showTable: cat.id === category.id,
            isFetchingNewArticles: cat.id === category.id ? true : cat.isFetchingNewArticles,
          }));

          setCategories(updatedCategories);

          toast.info(`Fetching news for "${category.name}" (${i + 1}/${updatedCategories.length})`, {
            autoClose: 2000,
          });

          await new Promise(resolve => setTimeout(resolve, 500));

          const customLinks = category.links.map(link => link.url.trim());
          const searchTerms = category.searchTerms;

          try {
            let apiUrl = "/api/category-article-links-scrapper";
            let fetchOptions = {};

            if (searchTerms.length > 0) {
              const searchUrl = `https://www.google.co.uk/search?q=${encodeURIComponent(
                searchTerms.join(" OR ")
              )}&tbm=nws&tbs=qdr:w`;

              console.log("Generated search URL:", searchUrl);

              if (customLinks.length > 0) {
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
                const encodedUrl = encodeURIComponent(searchUrl);
                apiUrl = `${apiUrl}?url=${encodedUrl}&processSummaries=true`;
              }
            } else if (customLinks.length > 0) {
              fetchOptions = {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ urls: customLinks }),
              };
            }

            const response = await fetch(apiUrl, fetchOptions);

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

            if (data.articles && data.articles.length > 0 && data.articles[0].title !== "") {
              const categoryIndex: number = updatedCategories.findIndex(cat => cat.id === category.id);

              if (categoryIndex !== -1) {
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

                updatedCategories[categoryIndex] = {
                  ...updatedCategories[categoryIndex],
                  articles: processedArticles,
                  isFetchingNewArticles: false,
                };

                setCategories([...updatedCategories]);
              }
            } else {
              updatedCategories = updatedCategories.map(cat =>
                cat.id === category.id ? { ...cat, isFetchingNewArticles: false } : cat
              );
              setCategories([...updatedCategories]);
            }
          } catch (error) {
            console.error(`Error fetching news data for category "${category.name}":`, error);

            updatedCategories = updatedCategories.map(cat =>
              cat.id === category.id ? { ...cat, isFetchingNewArticles: false } : cat
            );
            setCategories([...updatedCategories]);
          }

          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Error processing category "${category.name}":`, error);
          toast.error(`Failed to fetch news for "${category.name}"`);

          updatedCategories = updatedCategories.map(cat =>
            cat.id === category.id ? { ...cat, isFetchingNewArticles: false } : cat
          );

          setCategories([...updatedCategories]);

          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      const finalCategories = updatedCategories.map(cat => {
        return {
          ...cat,
          showTable: openCategoryIds.has(cat.id),
          isFetchingNewArticles: false,
        };
      });

      setCategories(finalCategories);
      setCategoriesFetching(null);
      setIsFetchingAllNewsByButton(false);

      toast.success("Completed fetching news for all categories");
    } catch (error) {
      console.error("Error in fetchAllNews:", error);
      toast.error("An error occurred while fetching news");
      setCategoriesFetching(null);
    }
  };

  // Refetch articles (populate empty titles/summaries)
  const refetchArticles = useCallback(
    async ({ categoryId }: { categoryId: number }): Promise<void> => {
      const category = categories.find(cat => cat.id === categoryId);

      if (!category) {
        console.error(`Category with ID ${categoryId} not found`);
        return;
      }

      const articlesToFetch = category.articles.filter(article => article.title === "" || article.summary === "");

      if (articlesToFetch.length === 0) {
        console.log("All articles are already fetched for this category");

        const categoriesUpdates = categories.map(cat =>
          cat.id === categoryId ? { ...cat, isFetchingNewArticles: false } : cat
        );

        const statusUpdates = categoriesStatus.map(status =>
          status.categoryId === categoryId
            ? { ...status, isFetchingArticles: false, isFetchedAllArticles: true }
            : status
        );

        setCategories(categoriesUpdates);
        setTimeout(() => {
          setCategoriesStatus(statusUpdates);
        }, 0);

        return;
      }

      const linksToFetch = articlesToFetch.map(article => article.link);
      console.log(`Fetching ${linksToFetch.length} articles for category ${category.name}`);

      interface Result {
        url: string;
        title: string;
        summary: string;
      }
      try {
        const response = await axios.post("/api/title-summaries-by-links", {
          links: linksToFetch,
          maxConcurrent: 5,
          maxWords: 100,
        });

        const data = response.data;

        const updatedArticles = category.articles.map(article => {
          if (article.title === "" || article.summary === "") {
            // const matchingResult = data.results.find(result => result.url === article.link);
            const matchingResult = data.results.find((result: Result) => result.url === article.link);
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

        const categoriesUpdates = categories.map(cat =>
          cat.id === categoryId ? { ...cat, articles: updatedArticles, isFetchingNewArticles: false } : cat
        );

        const statusUpdates = categoriesStatus.map(status =>
          status.categoryId === categoryId
            ? { ...status, isFetchingArticles: false, isFetchedAllArticles: true }
            : status
        );

        setCategories(categoriesUpdates);
        setTimeout(() => {
          setCategoriesStatus(statusUpdates);
        }, 0);

        setCategoriesStatus(prevStatus => {
          return prevStatus.map(status =>
            status.categoryId === categoryId
              ? { ...status, isFetchingArticles: false, isFetchedAllArticles: true }
              : status
          );
        });

        if (refFetchNews.current) {
          refFetchNews.current.innerText = "Fetched";
        }
      } catch (error) {
        console.error("Error fetching article details:", error);

        const categoriesUpdates = categories.map(cat =>
          cat.id === categoryId ? { ...cat, isFetchingNewArticles: false } : cat
        );

        const statusUpdates = categoriesStatus.map(status =>
          status.categoryId === categoryId
            ? { ...status, isFetchingArticles: false, isFetchedAllArticles: true }
            : status
        );

        setCategories(categoriesUpdates);
        setTimeout(() => {
          setCategoriesStatus(statusUpdates);
        }, 0);
      }
    },
    [categories, categoriesStatus, setCategories, setCategoriesStatus, refFetchNews]
  );

  // Automatically refetch articles with empty titles/summaries
  useEffect(() => {
    const shouldFetchArticles = categoriesStatus.some(
      status => status.isFetchingArticles && !status.isFetchedAllArticles
    );

    if (!shouldFetchArticles) {
      return;
    }

    let isCurrentlyFetching = false;

    const fetchArticles = async () => {
      if (isCurrentlyFetching) return;

      isCurrentlyFetching = true;

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

  return {
    categoriesFetching,
    setCategoriesFetching,
    isFetchingAllNewsByButton,
    categoriesStatus,
    setCategoriesStatus,
    refFetchNews,
    fetchNewsForCategory,
    fetchAllNews,
    refetchArticles,
  };
};
