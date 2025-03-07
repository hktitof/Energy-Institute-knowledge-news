"use client";
import { useState, useEffect } from "react";

export default function NewsSearch() {
  interface ThemeMap {
    [key: string]: string[];
  }

  interface NewsItem {
    title: string;
    paragraphs: string[];
    url: string;
    expandedView: boolean;
    summary: string;
    summarizing: boolean;
    selected: boolean;
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
  const [batchSummarizing, setBatchSummarizing] = useState(false);

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

  const generateGoogleNewsLink = (theme: string) => {
    const baseUrl = "https://www.google.co.uk/search";
    const query = themes[theme]?.join(" OR ") || "";
    return `${baseUrl}?sca_esv=588067978&tbs=cdr:1,cd_min:2/28/2025,cd_max:3/6/2025&tbm=nws&q=${encodeURIComponent(
      query
    )}`;
  };

  // Toggle expanded view for article content
  const toggleExpandedView = (theme: string, index: number) => {
    setNewsResults(prev => {
      const updatedThemeResults = [...prev[theme]];
      updatedThemeResults[index] = {
        ...updatedThemeResults[index],
        expandedView: !updatedThemeResults[index].expandedView,
      };
      return { ...prev, [theme]: updatedThemeResults };
    });
  };

  // Toggle article selection for batch summarization
  const toggleArticleSelection = (theme: string, index: number) => {
    setNewsResults(prev => {
      const updatedThemeResults = [...prev[theme]];
      updatedThemeResults[index] = {
        ...updatedThemeResults[index],
        selected: !updatedThemeResults[index].selected,
      };
      return { ...prev, [theme]: updatedThemeResults };
    });
  };

  // Extract all paragraphs from the article
  //   const extractParagraphs = (article: Element): string[] => {
  //     // This is a simplified approach - adjust the selectors based on Google News HTML structure
  //     const paragraphElements = article.querySelectorAll("div.GI74Re, div.BNeawe");
  //     const paragraphs: string[] = [];

  //     paragraphElements.forEach(el => {
  //       const text = el.textContent?.trim();
  //       if (text && text.length > 0 && !paragraphs.includes(text)) {
  //         paragraphs.push(text);
  //       }
  //     });

  //     return paragraphs.length > 0 ? paragraphs : ["No content available"];
  //   };
  const extractParagraphs = (article: Element): string[] => {
    const paragraphs: string[] = [];
    article.querySelectorAll("p").forEach(p => {
      const text = p.textContent?.trim();
      if (text) paragraphs.push(text);
    });
    return paragraphs;
  };

  // Function to summarize a single article
  const summarizeArticle = async (theme: string, index: number) => {
    const article = newsResults[theme][index];

    // Update status to show summarizing
    setNewsResults(prev => {
      const updatedThemeResults = [...prev[theme]];
      updatedThemeResults[index] = {
        ...updatedThemeResults[index],
        summarizing: true,
      };
      return { ...prev, [theme]: updatedThemeResults };
    });

    try {
      const allText = [article.title, ...article.paragraphs].join("\n\n");
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: allText }),
      });

      if (!response.ok) throw new Error("Failed to summarize");
      const data = await response.json();

      // Update article with summary
      setNewsResults(prev => {
        const updatedThemeResults = [...prev[theme]];
        updatedThemeResults[index] = {
          ...updatedThemeResults[index],
          summary: data.summary,
          summarizing: false,
        };
        return { ...prev, [theme]: updatedThemeResults };
      });
    } catch (err) {
      console.error("Error summarizing article:", err);

      // Update to show error
      setNewsResults(prev => {
        const updatedThemeResults = [...prev[theme]];
        updatedThemeResults[index] = {
          ...updatedThemeResults[index],
          summary: "Error generating summary",
          summarizing: false,
        };
        return { ...prev, [theme]: updatedThemeResults };
      });
    }
  };

  // Function to summarize all selected articles
  const summarizeSelected = async () => {
    setBatchSummarizing(true);

    try {
      // Process each selected article across all themes
      for (const theme of Object.keys(newsResults)) {
        for (let i = 0; i < newsResults[theme].length; i++) {
          const article = newsResults[theme][i];
          if (article.selected && !article.summary) {
            await summarizeArticle(theme, i);
          }
        }
      }
    } finally {
      setBatchSummarizing(false);
    }
  };

  // Function to fetch and parse news from Google
  const fetchNews = async (theme: string) => {
    setLoading(prev => ({ ...prev, [theme]: true }));
    setError(prev => ({ ...prev, [theme]: "" }));

    try {
      // We'll use a CORS proxy for demo purposes
      const corsProxy = "https://corsproxy.io/?";
      const url = generateGoogleNewsLink(theme);

      // Fetch first page
      const response = await fetch(`${corsProxy}${encodeURIComponent(url)}`);
      if (!response.ok) throw new Error("Failed to fetch news");
      const htmlText = await response.text();

      // Parse the HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, "text/html");

      // Extract news items
      const newsItems: NewsItem[] = [];
      const articles = doc.querySelectorAll("div.SoaBEf");

      articles.forEach(article => {
        const titleElement = article.querySelector("div.n0jPhd");
        const linkElement = article.querySelector("a");

        if (titleElement && linkElement) {
          const title = titleElement.textContent || "No title";
          const paragraphs = extractParagraphs(article);
          const fullUrl = linkElement.href;

          // Extract actual URL from Google redirect URL
          const url = new URL(fullUrl).searchParams.get("url") || fullUrl;

          newsItems.push({
            title,
            paragraphs,
            url,
            expandedView: false,
            summary: "",
            summarizing: false,
            selected: false,
          });
        }
      });

      // Now try to fetch second page if exists
      if (doc.querySelector("a#pnnext")) {
        const nextPageUrl = (doc.querySelector("a#pnnext") as HTMLAnchorElement)?.href;
        if (nextPageUrl) {
          const nextPageResponse = await fetch(`${corsProxy}${encodeURIComponent(nextPageUrl)}`);
          if (nextPageResponse.ok) {
            const nextPageHtml = await nextPageResponse.text();
            const nextPageDoc = parser.parseFromString(nextPageHtml, "text/html");

            const nextPageArticles = nextPageDoc.querySelectorAll("div.SoaBEf");
            nextPageArticles.forEach(article => {
              const titleElement = article.querySelector("div.n0jPhd");
              const linkElement = article.querySelector("a");

              if (titleElement && linkElement) {
                const title = titleElement.textContent || "No title";
                const paragraphs = extractParagraphs(article);
                const fullUrl = linkElement.href;

                // Extract actual URL from Google redirect URL
                const url = new URL(fullUrl).searchParams.get("url") || fullUrl;

                newsItems.push({
                  title,
                  paragraphs,
                  url,
                  expandedView: false,
                  summary: "",
                  summarizing: false,
                  selected: false,
                });
              }
            });
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

  // Function to check if any articles are selected
  const hasSelectedArticles = () => {
    for (const theme of Object.keys(newsResults)) {
      if (newsResults[theme].some(article => article.selected)) {
        return true;
      }
    }
    return false;
  };

  return (
    <div className="w-full min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-6">News Search & Analysis</h1>

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
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">News Results</h2>

            {/* Batch summarization button */}
            {Object.keys(newsResults).length > 0 && (
              <button
                onClick={summarizeSelected}
                disabled={batchSummarizing || !hasSelectedArticles()}
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:bg-purple-300 flex items-center gap-2"
              >
                {batchSummarizing ? "Summarizing..." : "Summarize Selected"}
              </button>
            )}
          </div>

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
                    <span className="text-sm text-gray-500">{newsResults[theme]?.length || 0} articles</span>
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
                            <th
                              scope="col"
                              className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8"
                            >
                              <span className="sr-only">Select</span>
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Title
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Content
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Summary
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16"
                            >
                              Link
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {newsResults[theme].map((item, idx) => (
                            <tr key={idx}>
                              <td className="px-3 py-4 whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={item.selected}
                                  onChange={() => toggleArticleSelection(theme, idx)}
                                  className="w-4 h-4"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-normal">
                                <div className="text-sm font-medium text-gray-900">{item.title}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-500">
                                  {item.expandedView ? (
                                    <div>
                                      {item.paragraphs.map((para, pidx) => (
                                        <p key={pidx} className="mb-2">
                                          {para}
                                        </p>
                                      ))}
                                      <button
                                        onClick={() => toggleExpandedView(theme, idx)}
                                        className="text-blue-500 hover:underline text-xs mt-2"
                                      >
                                        Show Less
                                      </button>
                                    </div>
                                  ) : (
                                    <div>
                                      <p className="line-clamp-3">{item.paragraphs[0] || "No content available"}</p>
                                      {(item.paragraphs.length > 1 ||
                                        (item.paragraphs[0] && item.paragraphs[0].length > 150)) && (
                                        <button
                                          onClick={() => toggleExpandedView(theme, idx)}
                                          className="text-blue-500 hover:underline text-xs mt-2"
                                        >
                                          Read More
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                {item.summarizing ? (
                                  <div className="text-sm text-gray-500">Generating summary...</div>
                                ) : item.summary ? (
                                  <div className="text-sm text-gray-500">{item.summary}</div>
                                ) : (
                                  <button
                                    onClick={() => summarizeArticle(theme, idx)}
                                    className="bg-blue-500 text-white px-2 py-1 text-xs rounded hover:bg-blue-600"
                                  >
                                    Summarize
                                  </button>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <a href={item.url} target="_blank" className="text-blue-500 hover:underline text-sm">
                                  Visit
                                </a>
                              </td>
                            </tr>
                          ))}
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
