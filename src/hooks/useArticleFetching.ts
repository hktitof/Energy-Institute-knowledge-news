import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";

// import { ArticleFetchProgressProps } from "../utils/utils";
interface CategoryStatus {
  categoryId: number;
  isFetchingArticles: boolean;
  isFetchedAllArticles: boolean;
}
export type Article = {
  id: string;
  title: string;
  summary: string;
  link: string;
  selected: boolean;
};
export type ArticleFetchProgressProps = {
  totalArticles: number;
  fetchedCount: number;
  errorCount: number;
  currentArticle: string | null;
  isActive: boolean;
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
  articleFetchProgressProps: ArticleFetchProgressProps;
}

export const useArticleFetching = (
  categories: Category[],
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>
) => {
  // this useState is used to track the selected fetching Category and will be used when fetching multiple categories
  const [categoriesFetching, setCategoriesFetching] = useState<string | number | null>(null);
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
    categoryId: string | number,
    customLinks: string[] = [],
    categories: Category[] = [],
    setCategories: React.Dispatch<React.SetStateAction<Category[]>>,
  ) => {
    const categoryData = categories.length ? categories : categories;
    const category = categoryData.find(cat => cat.id === categoryId);

    if (!category) {
      console.error(`Category with ID ${categoryId} not found`);
      return [];
    }

    // Set loading state
    setCategories(prevCategories =>
      prevCategories.map(cat =>
        cat.id === categoryId
          ? {
              ...cat,
              articleFetchProgressProps: {
                ...cat.articleFetchProgressProps,
                isActive: true,
              },
              fetchedAllArticles: false,
            }
          : cat
      )
    );

    console.log(`Fetching news for category: ${category.name}`);
    console.log(`Search terms: ${category.searchTerms.join(", ")}`);
    console.log(`Custom links: ${customLinks.length}`);

    // Initialize progress tracking in the category based on its type Category white will be totalArticles: 0, fetchedCount: 0,errorCount: 0,currentArticle: null,  isActive: true,
    setCategories(prevCategories =>
      prevCategories.map(cat =>
        cat.id === categoryId
          ? {
              ...cat,
              articleFetchProgressProps: {
                ...cat.articleFetchProgressProps,
                totalArticles: 0,
                fetchedCount: 0,
                errorCount: 0,
                currentArticle: null,
                isActive: true,
              },
            }
          : cat
      )
    );

    try {
      // Step 1: Determine the total number of articles to fetch
      const searchUrl =
        category.searchTerms.length > 0
          ? `https://www.google.co.uk/search?q=${encodeURIComponent(
              category.searchTerms.join(" OR ")
            )}&tbm=nws&tbs=qdr:w`
          : "";

      let linksToProcess: string[] = [...customLinks];

      // If we have a search URL, get the links from Google
      if (searchUrl) {
        try {
          const countResponse = await fetch("/api/count-article-links", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              searchUrl,
            }),
          });

          if (!countResponse.ok) {
            console.error(`Failed to count links: ${countResponse.status}`);
            throw new Error(`Failed to count links: ${countResponse.status}`);
          }

          const countData = await countResponse.json();

          // Add Google links to our processing list
          linksToProcess = [...linksToProcess, ...countData.links];

          console.log(`Found ${countData.count} links from Google search`);
        } catch (error) {
          console.error("Error counting links:", error);
        }
      }

      // Update total articles count for the category
      setCategories(prevCategories =>
        prevCategories.map(cat =>
          cat.id === categoryId
            ? {
                ...cat,
                articleFetchProgressProps: {
                  ...cat.articleFetchProgressProps,
                  totalArticles: linksToProcess.length,
                },
              }
            : cat
        )
      );

      // If no links to process, exit early
      if (linksToProcess.length === 0) {
        setCategories(prevCategories => {
          return prevCategories.map(cat => {
            if (cat.id === categoryId) {
              return {
                ...cat,
                isFetchingNewArticles: false,
                fetchedAllArticles: true,
              };
            }
            return cat;
          });
        });
        // set isActive to false
        setCategories(prevCategories =>
          prevCategories.map(cat =>
            cat.id === categoryId
              ? {
                  ...cat,
                  articleFetchProgressProps: {
                    ...cat.articleFetchProgressProps,
                    isActive: false,
                  },
                }
              : cat
          )
        );
        return [];
      }

      // Step 2: Process each link one by one
      const processedArticles: Article[] = [];
      let fetchedCount = 0;
      let errorCount = 0;

      for (let i = 0; i < linksToProcess.length; i++) {
        const link = linksToProcess[i];
        const articleId = `${categoryId}-${i}`;

        // Update progress with current article
        setCategories(prevCategories =>
          prevCategories.map(cat =>
            cat.id === categoryId
              ? {
                  ...cat,
                  articleFetchProgressProps: {
                    ...cat.articleFetchProgressProps,
                    currentArticle: link,
                  },
                }
              : cat
          )
        );

        try {
          const articleResponse = await fetch("/api/fetch-one-article", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: link,
              articleId,
            }),
          });

          if (!articleResponse.ok) {
            throw new Error(`Failed to fetch article: ${articleResponse.status}`);
          }

          const articleData = await articleResponse.json();

          if (articleData.success) {
            // Process the article
            const processedArticle: Article = {
              ...articleData.article,
              summary: extractSummary(articleData.article.summary),
            };

            processedArticles.push(processedArticle);
            fetchedCount++;

            // Update category with the new article immediately
            setCategories(prevCategories => {
              return prevCategories.map(cat => {
                if (cat.id === categoryId) {
                  return {
                    ...cat,
                    articles: [...cat.articles, processedArticle],
                  };
                }
                return cat;
              });
            });
          } else {
            // Handle failed article
            errorCount++;
          }
        } catch (error) {
          console.error(`Error processing article ${link}:`, error);
          errorCount++;
        }

        // Update progress
        // Update progress for articleFetchProgressProps
        setCategories(prevCategories =>
          prevCategories.map(cat =>
            cat.id === categoryId
              ? {
                  ...cat,
                  articleFetchProgressProps: {
                    ...cat.articleFetchProgressProps,
                    fetchedCount,
                    errorCount,
                  },
                }
              : cat
          )
        );

        // Add a small delay between requests to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      // Step 3: Update category state when all articles are processed
      setCategories(prevCategories => {
        return prevCategories.map(cat => {
          if (cat.id === categoryId) {
            return {
              ...cat,
              isFetchingNewArticles: false,
              fetchedAllArticles: true,
              // Fix article IDs to ensure uniqueness
              articles: cat.articles.map((article, index) => ({
                ...article,
                id: index.toString(),
              })),
            };
          }
          return cat;
        });
      });

      // Clear progress
      setCategories(prevCategories =>
        prevCategories.map(cat =>
          cat.id === categoryId
            ? {
                ...cat,
                articleFetchProgressProps: {
                  ...cat.articleFetchProgressProps,
                  currentArticle: null,
                  isActive: false,
                },
              }
            : cat
        )
      );

      return processedArticles;
    } catch (error) {
      console.error("Error fetching news:", error);

      // Update category state to reflect error
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

      // Clear progress
      setCategories(prevCategories =>
        prevCategories.map(cat =>
          cat.id === categoryId
            ? {
                ...cat,
                articleFetchProgressProps: {
                  ...cat.articleFetchProgressProps,
                  currentArticle: null,
                  isActive: false,
                },
              }
            : cat
        )
      );

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
