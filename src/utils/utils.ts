import axios from "axios";

// types

// types.ts (or at top of hook file)
export type PromptPurpose = "article_summary" | "summary_of_summary";

export interface PromptData {
  systemPrompt: string;
  userPrompt: string;
}

export interface Link {
  id: number;
  url: string;
  title: string | null;
}

export interface NewsAggregatorProps {
  isTestMode?: boolean;
}

export type ApiCategory = {
  CategoryID: number;
  CategoryName: string;
  searchTerms: { SearchTermID: number; Term: string }[];
  links: { LinkID: number; URL: string; Title?: string | null }[];
  articles: Article[];
};

export type ArticleFetchProgressProps = {
  totalArticles: number;
  fetchedCount: number;
  errorCount: number;
  currentArticle: string | null;
  isActive: boolean;
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
  articleFetchProgressProps: ArticleFetchProgressProps;
}

export interface CategoryStatus {
  categoryId: string | number;
  isFetchingArticles: boolean;
  isFetchedAllArticles: boolean;
}

// Helper function to extract the summary from markdown JSON

// Function helpers

// Fetch categories, search terms, and links from API
// Fetch categories, search terms, and links from API
export const fetchCategories = async (setCategories: React.Dispatch<React.SetStateAction<Category[]>>) => {
  try {
    const response = await axios.get<{ categories: ApiCategory[] }>("/api/categories/categories");
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
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw error; // Re-throw the error so the caller can handle it
  }
};

// --- Constants (var_systemPrompt, var_userPromptInstructions) remain the same ---
export const default_single_article_systemPrompt =
  "You are an expert at analyzing web content and creating summaries of articles, blog posts, and informative content. You can identify whether content is an article worthy of summarization or not. You're designed to be inclusive and summarize a wide range of content formats, including technical descriptions, project overviews, and news articles, even if they have unconventional structures";

export const default_single_article_userPromptInstructions = `I need you to analyze the following web content and determine if it's a summarizable article, news post, project description, or other informative content.

Title extracted from the page: ${"{title}"}

Content extracted from the page:
---
${"{textContent}"}
---

First, determine if this is SUMMARIZABLE CONTENT. Content is summarizable if it:
1. Contains informative, factual, or news-related information
2. Has a coherent narrative or structure
3. Provides details about events, projects, research, products, etc.
4. Is NOT primarily navigation menus, sparse listings, or computer-generated code

Even if the content has an unconventional structure or is presented as a project overview, product description, or technical information, it can still be summarizable if it communicates meaningful information.

If the content IS summarizable, create a concise summary (maximum ${"{maxWords}"} words) capturing the key information.

If the content is NOT summarizable (meaning it's just navigation elements, random text snippets without context, or computer code), indicate this in your response.

Return your analysis as a JSON object with this format:
{
  "is_summarizable": true/false,
  "title": "The original title or improved version if needed",
  "summary": "Your concise summary of the content"
}

For non-summarizable content, use:
{
  "is_summarizable": false,
  "title": "NOT AN ARTICLE",
  "summary": "Content does not appear to be a summarizable article."
}

IMPORTANT: Be inclusive in what you consider summarizable. Technical descriptions, project information, research findings, and product details ARE summarizable even if they don't follow traditional article formats.`;

// --- Constants (var_systemPrompt, var_userPromptInstructions) remain the same ---
export const default_summary_of_summary_systemPrompt =
  "You are an expert at analyzing web content and creating summaries of articles, blog posts, and informative content. You can identify whether content is an article worthy of summarization or not. You're designed to be inclusive and summarize a wide range of content formats, including technical descriptions, project overviews, and news articles, even if they have unconventional structures";

export const default_summary_of_summary_userPromptInstructions = `I need you to analyze the following web content and determine if it's a summarizable article, news post, project description, or other informative content.

Title extracted from the page: ${"{title}"}

Content extracted from the page:
---
${"{textContent}"}
---

First, determine if this is SUMMARIZABLE CONTENT. Content is summarizable if it:
1. Contains informative, factual, or news-related information
2. Has a coherent narrative or structure
3. Provides details about events, projects, research, products, etc.
4. Is NOT primarily navigation menus, sparse listings, or computer-generated code

Even if the content has an unconventional structure or is presented as a project overview, product description, or technical information, it can still be summarizable if it communicates meaningful information.

If the content IS summarizable, create a concise summary (maximum ${"{maxWords}"} words) capturing the key information.

If the content is NOT summarizable (meaning it's just navigation elements, random text snippets without context, or computer code), indicate this in your response.

Return your analysis as a JSON object with this format:
{
  "is_summarizable": true/false,
  "title": "The original title or improved version if needed",
  "summary": "Your concise summary of the content"
}

For non-summarizable content, use:
{
  "is_summarizable": false,
  "title": "NOT AN ARTICLE",
  "summary": "Content does not appear to be a summarizable article."
}

IMPORTANT: Be inclusive in what you consider summarizable. Technical descriptions, project information, research findings, and product details ARE summarizable even if they don't follow traditional article formats.`;
