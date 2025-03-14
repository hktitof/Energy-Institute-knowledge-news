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

      articles.forEach(article => {
        const titleElement = article.querySelector("div.n0jPhd");
        const linkElement = article.querySelector("a");
        const snippetElement = article.querySelector("div.GI74Re");

        if (titleElement && linkElement && snippetElement) {
          const title = titleElement.textContent || "No title";
          const paragraph = snippetElement.textContent || "No content";
          const fullUrl = linkElement.getAttribute("href") || "";

          // Extract actual URL from Google redirect URL
          const url = new URL(fullUrl).searchParams.get("url") || fullUrl;

          newsItems.push({ title, paragraph, url });
        }
      });

      // Now try to fetch second page if exists
      if (doc.querySelector("a#pnnext")) {
        const nextPageUrl = doc.querySelector("a#pnnext")?.getAttribute("href");
        if (nextPageUrl) {
          const nextPageResponse = await fetch(`${corsProxy}${encodeURIComponent(nextPageUrl)}`);
          if (nextPageResponse.ok) {
            const nextPageHtml = await nextPageResponse.text();
            const nextPageDoc = parser.parseFromString(nextPageHtml, "text/html");

            const nextPageArticles = nextPageDoc.querySelectorAll("div.SoaBEf");
            nextPageArticles.forEach(article => {
              const titleElement = article.querySelector("div.n0jPhd");
              const linkElement = article.querySelector("a");
              const snippetElement = article.querySelector("div.GI74Re");

              if (titleElement && linkElement && snippetElement) {
                const title = titleElement.textContent || "No title";
                const paragraph = snippetElement.textContent || "No content";
                const fullUrl = linkElement.getAttribute("href") || "";

                // Extract actual URL from Google redirect URL
                const url = new URL(fullUrl).searchParams.get("url") || fullUrl;

                newsItems.push({ title, paragraph, url });
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
                  <div className="bg-gray-100 p-3 border-b">
                    <h3 className="font-medium">{theme}</h3>
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
                              Link
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {newsResults[theme].map((item, idx) => (
                            <tr key={idx}>
                              <td className="px-6 py-4 whitespace-normal">
                                <div className="text-sm font-medium text-gray-900">{item.title}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-500">{item.paragraph}</div>
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
                      <p className="text-gray-500">No news fetched yet. Click &quot;Fetch News&quot; to get articles.</p>
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
