"use client";
import { useState, useEffect } from "react";

export default function NewsSearch() {
  interface ThemeMap {
    [key: string]: string[];
  }

  interface NewsItem {
    title: string;
    paragraph: string;
    url: string;
    fullContent?: string;
    summary?: string;
    selected?: boolean;
  }

  // Initialize with default themes, defer localStorage access to useEffect
  const [themes, setThemes] = useState<ThemeMap>({
    Hydrogen: ["hydrogen economy", "fuel cell", "blue hydrogen", "green hydrogen", "electrolysis"],
  });

  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [newTheme, setNewTheme] = useState("");
  const [newSearchTerm, setNewSearchTerm] = useState("");
  const [selectedThemeForSearchTerm, setSelectedThemeForSearchTerm] = useState("");
  const [newsResults, setNewsResults] = useState<{ [key: string]: NewsItem[] }>({});
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<{ [key: string]: string }>({});
  const [expandedContents, setExpandedContents] = useState<{ [key: string]: boolean }>({});
  const [expandedSummaries, setExpandedSummaries] = useState<{ [key: string]: boolean }>({});
  const [summarizing, setSummarizing] = useState<{ [key: string]: boolean }>({});

  // Load themes from localStorage only after component mounts (client-side)
  useEffect(() => {
    const storedThemes = localStorage.getItem("themes");
    if (storedThemes) {
      setThemes(JSON.parse(storedThemes));
    }
  }, []);

  // Save themes to localStorage when they change
  useEffect(() => {
    localStorage.setItem("themes", JSON.stringify(themes));
  }, [themes]);

  // Declare an interface for the theme toggle function
  interface ThemeToggleFunction {
    (theme: string): void;
  }

  // Declare a function to toggle the selected themes
  const toggleTheme: ThemeToggleFunction = theme => {
    setSelectedThemes(prev => (prev.includes(theme) ? prev.filter(t => t !== theme) : [...prev, theme]));
  };

  // Declare a function to add a new theme
  const addTheme = () => {
    if (newTheme && !themes[newTheme]) {
      interface ThemeState {
        [key: string]: string[];
      }

      // Set the themes state to a new object with the new theme added
      setThemes((prev: ThemeState) => ({ ...prev, [newTheme]: [] }));
      // Set the newTheme state to an empty string
      setNewTheme("");
    }
  };

  // Declare a function to add a new search term
  const addSearchTerm = () => {
    if (newSearchTerm && selectedThemeForSearchTerm) {
      interface ThemeMap {
        [key: string]: string[];
      }

      setThemes((prev: ThemeMap) => ({
        ...prev,
        [selectedThemeForSearchTerm]: [...prev[selectedThemeForSearchTerm], newSearchTerm],
      }));
      setNewSearchTerm("");
    }
  };

  interface GoogleNewsLinkGenerator {
    (theme: string): string;
  }

  const generateGoogleNewsLink: GoogleNewsLinkGenerator = theme => {
    const baseUrl: string = "https://www.google.co.uk/search";
    const query: string = themes[theme]?.join(" OR ") || "";
    return `${baseUrl}?sca_esv=588067978&tbs=cdr:1,cd_min:2/28/2025,cd_max:3/6/2025&tbm=nws&q=${encodeURIComponent(
      query
    )}`;
  };

  // Toggle article selection
  const toggleArticleSelection = (theme: string, index: number) => {
    setNewsResults(prev => {
      const updatedThemeNews = [...prev[theme]];
      updatedThemeNews[index] = {
        ...updatedThemeNews[index],
        selected: !updatedThemeNews[index].selected,
      };
      return { ...prev, [theme]: updatedThemeNews };
    });
  };

  // Toggle content expansion
  const toggleContentExpansion = (theme: string, index: number) => {
    const key = `${theme}-${index}`;
    setExpandedContents(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Toggle summary expansion
  const toggleSummaryExpansion = (theme: string, index: number) => {
    const key = `${theme}-${index}`;
    setExpandedSummaries(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Summarize a single article
  const summarizeArticle = async (theme: string, index: number) => {
    const newsItem = newsResults[theme][index];
    const key = `${theme}-${index}`;

    setSummarizing(prev => ({ ...prev, [key]: true }));

    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: `Summarize the following text: ${newsItem.fullContent || newsItem.paragraph}, do no exceed 100 words! provide the summary as an output only!`,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to summarize text: ${response.statusText}`);
      }

      const data = await response.json();

      setNewsResults(prev => {
        const updatedThemeNews = [...prev[theme]];
        updatedThemeNews[index] = {
          ...updatedThemeNews[index],
          summary: data.summary,
        };
        return { ...prev, [theme]: updatedThemeNews };
      });
    } catch (err) {
      console.error("Error summarizing article:", err);
      alert("Failed to summarize article. Please try again.");
    } finally {
      setSummarizing(prev => ({ ...prev, [key]: false }));
    }
  };

  // Summarize all selected articles
  const summarizeSelectedArticles = async (theme: string) => {
    const selectedArticles = newsResults[theme].filter(item => item.selected);

    for (let i = 0; i < selectedArticles.length; i++) {
      const index = newsResults[theme].findIndex(item => item === selectedArticles[i]);
      await summarizeArticle(theme, index);
    }
  };

  // Function to fetch and parse news from Google
  const fetchNews = async (theme: string) => {
    setLoading(prev => ({ ...prev, [theme]: true }));
    setError(prev => ({ ...prev, [theme]: "" }));

    try {
      // We'll use a CORS proxy for demo purposes
      // In production, you should set up your own proxy server
      const corsProxy = "https://corsproxy.io/?";
      const url = generateGoogleNewsLink(theme);

      // Fetch first page
      const response = await fetch(`${corsProxy}${encodeURIComponent(url)}`);
      if (!response.ok) throw new Error("Failed to fetch news");
      const htmlText = await response.text();

      // Parse the HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, "text/html");

      // Extract news items (this selector needs to be adjusted based on Google's current HTML structure)
      const newsItems: NewsItem[] = [];
      const articles = doc.querySelectorAll("div.SoaBEf");

      for (let i = 0; i < articles.length; i++) {
        const article = articles[i];
        const titleElement = article.querySelector("div.n0jPhd");
        const linkElement = article.querySelector("a");
        const snippetElement = article.querySelector("div.GI74Re");

        if (titleElement && linkElement && snippetElement) {
          const title = titleElement.textContent || "No title";
          const paragraph = snippetElement.textContent || "No content";
          const fullUrl = linkElement.href;

          // Extract actual URL from Google redirect URL
          const url = new URL(fullUrl).searchParams.get("url") || fullUrl;

          try {
            // Fetch the full article content
            const articleResponse = await fetch(`${corsProxy}${encodeURIComponent(url)}`);
            if (articleResponse.ok) {
              const articleHtml = await articleResponse.text();
              const articleDoc = parser.parseFromString(articleHtml, "text/html");

              // Try to extract main content - this is a simplified approach and may need adjustments
              // based on the actual structure of the articles
              let fullContent = "";

              // Try common content selectors
              const contentSelectors = [
                "article",
                ".article-content",
                ".article-body",
                ".story-body",
                ".post-content",
                "main",
              ];

              for (const selector of contentSelectors) {
                const contentElement = articleDoc.querySelector(selector);
                if (contentElement) {
                  // Extract all paragraphs
                  const paragraphs = contentElement.querySelectorAll("p");
                  if (paragraphs.length > 0) {
                    fullContent = Array.from(paragraphs)
                      .map(p => p.textContent)
                      .filter(Boolean)
                      .join("\n\n");
                    break;
                  }
                }
              }

              // Fallback to body if no content found
              if (!fullContent) {
                const paragraphs = articleDoc.querySelectorAll("body p");
                fullContent = Array.from(paragraphs)
                  .map(p => p.textContent)
                  .filter(Boolean)
                  .join("\n\n");
              }

              newsItems.push({
                title,
                paragraph,
                url,
                fullContent: fullContent || paragraph,
                selected: false,
              });
            } else {
              // If we can't fetch the article, just use the snippet
              newsItems.push({ title, paragraph, url, fullContent: paragraph, selected: false });
            }
          } catch {
            // If fetching full content fails, still add the item with just the snippet
            newsItems.push({ title, paragraph, url, fullContent: paragraph, selected: false });
          }
        }
      }

      setNewsResults(prev => ({ ...prev, [theme]: newsItems }));
    } catch (err) {
      console.error("Error fetching news:", err);
      setError(prev => ({ ...prev, [theme]: err instanceof Error ? err.message : "Unknown error" }));
    } finally {
      setLoading(prev => ({ ...prev, [theme]: false }));
    }
  };

  return (
    <div className="w-full min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-6">News Search</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 bg-gray-50 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Themes</h2>

          <div className="space-y-4">
            {Object.keys(themes).map(theme => (
              <div key={theme} className="border p-3 rounded bg-white">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id={theme}
                    checked={selectedThemes.includes(theme)}
                    onChange={() => toggleTheme(theme)}
                    className="w-4 h-4"
                  />
                  <label htmlFor={theme} className="font-medium">
                    {theme}
                  </label>
                </div>

                <div className="pl-6 text-sm space-y-1">
                  <p className="text-gray-500">Search terms:</p>
                  {themes[theme].length > 0 ? (
                    <ul className="list-disc pl-4">
                      {themes[theme].map((term: string, index: number) => (
                        <li key={index}>{term}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-400 italic">No search terms added</p>
                  )}
                </div>

                <div className="mt-3 flex justify-between">
                  <a
                    href={generateGoogleNewsLink(theme)}
                    target="_blank"
                    className="text-blue-500 text-sm hover:underline"
                  >
                    View in Google News
                  </a>

                  <button
                    onClick={() => fetchNews(theme)}
                    disabled={loading[theme]}
                    className="bg-blue-500 text-white px-3 py-1 text-sm rounded hover:bg-blue-600 disabled:bg-blue-300"
                  >
                    {loading[theme] ? "Loading..." : "Fetch News"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm mb-1">Add New Theme</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Theme name"
                  value={newTheme}
                  onChange={e => setNewTheme(e.target.value)}
                  className="border rounded p-2 flex-grow"
                />
                <button
                  onClick={addTheme}
                  disabled={!newTheme}
                  className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 disabled:bg-blue-300"
                >
                  Add
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1">Add Search Term to Theme</label>
              <div className="flex flex-col gap-2">
                <select
                  onChange={e => setSelectedThemeForSearchTerm(e.target.value)}
                  value={selectedThemeForSearchTerm}
                  className="border rounded p-2"
                >
                  <option value="">Select Theme</option>
                  {Object.keys(themes).map(theme => (
                    <option key={theme} value={theme}>
                      {theme}
                    </option>
                  ))}
                </select>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="New search term"
                    value={newSearchTerm}
                    onChange={e => setNewSearchTerm(e.target.value)}
                    className="border rounded p-2 flex-grow"
                  />
                  <button
                    onClick={addSearchTerm}
                    disabled={!newSearchTerm || !selectedThemeForSearchTerm}
                    className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 disabled:bg-green-300"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-1 md:col-span-2">
          <h2 className="text-xl font-semibold mb-4">News Results</h2>

          {selectedThemes.length === 0 ? (
            <div className="bg-gray-50 p-6 rounded-lg text-center">
              <p className="text-gray-500">Select a theme to see news results</p>
            </div>
          ) : (
            <div className="space-y-6">
              {selectedThemes.map(theme => (
                <div key={theme} className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-100 p-3 border-b flex justify-between items-center">
                    <h3 className="font-medium">{theme}</h3>
                    {newsResults[theme] && newsResults[theme].length > 0 && (
                      <button
                        onClick={() => summarizeSelectedArticles(theme)}
                        className="bg-green-500 text-white px-3 py-1 text-sm rounded hover:bg-green-600"
                      >
                        Summarize Selected
                      </button>
                    )}
                  </div>

                  {error[theme] ? (
                    <div className="p-4 bg-red-50 text-red-600">
                      <p>Error: {error[theme]}</p>
                      <p className="text-sm mt-2">
                        Note: Due to CORS restrictions, this feature may not work in all browsers without a proper
                        backend proxy.
                      </p>
                    </div>
                  ) : loading[theme] ? (
                    <div className="p-6 text-center">
                      <p className="text-gray-500">Loading news articles...</p>
                    </div>
                  ) : newsResults[theme] && newsResults[theme].length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-2 py-3 text-center">
                              <span className="sr-only">Select</span>
                            </th>
                            <th
                              scope="col"
                              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Title
                            </th>
                            <th
                              scope="col"
                              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Content
                            </th>
                            <th
                              scope="col"
                              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Summary
                            </th>
                            <th
                              scope="col"
                              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Link
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {newsResults[theme].map((item, idx) => {
                            const contentKey = `${theme}-${idx}`;
                            const summaryKey = `${theme}-${idx}`;
                            const isContentExpanded = expandedContents[contentKey];
                            const isSummaryExpanded = expandedSummaries[summaryKey];
                            const isSummarizing = summarizing[contentKey];

                            return (
                              <tr key={idx}>
                                <td className="px-2 py-4 whitespace-nowrap text-center">
                                  <input
                                    type="checkbox"
                                    checked={item.selected || false}
                                    onChange={() => toggleArticleSelection(theme, idx)}
                                    className="w-4 h-4"
                                  />
                                </td>
                                <td className="px-4 py-4 whitespace-normal">
                                  <div className="text-sm font-medium text-gray-900">{item.title}</div>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="text-sm text-gray-500">
                                    {item.fullContent ? (
                                      <>
                                        <div>
                                          {isContentExpanded
                                            ? item.fullContent
                                            : item.fullContent.substring(0, 150) +
                                              (item.fullContent.length > 150 ? "..." : "")}
                                        </div>
                                        {item.fullContent.length > 150 && (
                                          <button
                                            onClick={() => toggleContentExpansion(theme, idx)}
                                            className="text-blue-500 hover:underline mt-1 text-xs"
                                          >
                                            {isContentExpanded ? "Read less" : "Read more"}
                                          </button>
                                        )}
                                      </>
                                    ) : (
                                      item.paragraph
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  {isSummarizing ? (
                                    <div className="text-sm text-gray-500">Summarizing...</div>
                                  ) : item.summary ? (
                                    <div className="text-sm text-gray-500">
                                      <div>
                                        {isSummaryExpanded
                                          ? item.summary
                                          : item.summary.substring(0, 150) + (item.summary.length > 150 ? "..." : "")}
                                      </div>
                                      {item.summary.length > 150 && (
                                        <button
                                          onClick={() => toggleSummaryExpansion(theme, idx)}
                                          className="text-blue-500 hover:underline mt-1 text-xs"
                                        >
                                          {isSummaryExpanded ? "Read less" : "Read more"}
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => summarizeArticle(theme, idx)}
                                      className="text-sm bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                                    >
                                      Summarize
                                    </button>
                                  )}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <a href={item.url} target="_blank" className="text-blue-500 hover:underline text-sm">
                                    Visit
                                  </a>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-6 text-center">
                      <p className="text-gray-500">
                        No news fetched yet. Click &quot;Fetch News&quot; to get articles.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
