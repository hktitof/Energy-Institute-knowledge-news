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

  const NEWS_API_KEY = process.env.NEXT_PUBLIC_NEWS_API_KEY;

  useEffect(() => {
    const storedThemes = localStorage.getItem("themes");
    if (storedThemes) {
      setThemes(JSON.parse(storedThemes));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("themes", JSON.stringify(themes));
  }, [themes]);

  const toggleTheme = (theme: string) => {
    setSelectedThemes(prev => (prev.includes(theme) ? prev.filter(t => t !== theme) : [...prev, theme]));
  };

  const addTheme = () => {
    if (newTheme && !themes[newTheme]) {
      setThemes(prev => ({ ...prev, [newTheme]: [] }));
      setNewTheme("");
    }
  };

  const addSearchTerm = () => {
    if (newSearchTerm && selectedThemeForSearchTerm) {
      setThemes(prev => ({
        ...prev,
        [selectedThemeForSearchTerm]: [...prev[selectedThemeForSearchTerm], newSearchTerm],
      }));
      setNewSearchTerm("");
    }
  };

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

  const toggleContentExpansion = (theme: string, index: number) => {
    const key = `${theme}-${index}`;
    setExpandedContents(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleSummaryExpansion = (theme: string, index: number) => {
    const key = `${theme}-${index}`;
    setExpandedSummaries(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

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
          text: `Summarize the following text: ${newsItem.fullContent || newsItem.paragraph}, do not exceed 50 words`,
        }),
      });

      if (!response.ok) throw new Error(`Failed to summarize text: ${response.statusText}`);

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

  const summarizeSelectedArticles = async (theme: string) => {
    const selectedArticles = newsResults[theme].filter(item => item.selected);
    for (let i = 0; i < selectedArticles.length; i++) {
      const index = newsResults[theme].findIndex(item => item === selectedArticles[i]);
      await summarizeArticle(theme, index);
    }
  };

  const fetchNews = async (theme: string) => {
    setLoading(prev => ({ ...prev, [theme]: true }));
    setError(prev => ({ ...prev, [theme]: "" }));

    try {
      const response = await fetch(
        `https://newsapi.org/v2/everything?q=${encodeURIComponent(themes[theme].join(" OR "))}&apiKey=${NEWS_API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`NewsAPI Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.status !== "ok") {
        throw new Error(data.message || "Failed to fetch news");
      }

      const newsItems = data.articles.map(
        (article: { title: string; description: string; url: string; content: string }) => ({
          title: article.title || "No title available",
          paragraph: article.description || "No description available",
          url: article.url,
          fullContent: article.content || article.description || "No content available",
          selected: false,
        })
      );

      setNewsResults(prev => ({ ...prev, [theme]: newsItems }));
    } catch (err) {
      console.error("Error fetching news:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch news articles";
      setError(prev => ({ ...prev, [theme]: errorMessage }));
    } finally {
      setLoading(prev => ({ ...prev, [theme]: false }));
    }
  };

  // JSX remains the same as in your original code until the Google News link removal
  return (
    <div className="w-full min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-6">News Search</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Themes Panel - Remove Google News Link */}
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

                <div className="mt-3 flex justify-end">
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
          {/* Rest of the theme management UI remains the same */}
          {/* ... */}
        </div>

        {/* News Results Panel - No changes needed to table structure */}
        <div className="col-span-1 md:col-span-2">
          {/* ... Same results display code ... */}

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
