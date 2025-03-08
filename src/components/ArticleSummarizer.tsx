import { useState } from "react";
import axios from "axios";

interface SummaryResult {
  success: true;
  url: string;
  title: string;
  summary: string;
  originalContent: string;
  contentLength: number;
  jsonOutput: {
    title: string;
    summary: string;
  };
}

interface ErrorResult {
  success: false;
  error: string;
}

type ApiResponse = SummaryResult | ErrorResult;

const ArticleSummarizer = () => {
  const [url, setUrl] = useState("");
  const [maxWords, setMaxWords] = useState(100);
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"summary" | "original" | "json">("summary");
  const [copied, setCopied] = useState<"summary" | "original" | "json" | null>(null);

  const handleSubmit = async () => {
    if (!url.trim()) {
      setError("Please enter a valid URL");
      return;
    }

    if (!url.startsWith("http")) {
      setError("Please enter a URL starting with http:// or https://");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setCopied(null);

    try {
      const response = await axios.post<ApiResponse>("/api/extract-and-summarize", {
        url,
        maxWords,
      });

      if (response.data.success) {
        setResult(response.data);
      } else {
        setError((response.data as ErrorResult).error || "Failed to process article");
      }
    } catch (error) {
      console.error(error);
      setError("Failed to process article. Please check the URL and try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: "summary" | "original" | "json") => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="w-full max-w-3xl bg-white rounded-lg shadow-lg p-6 mt-8">
      <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">Article Summarizer</h1>

      <div className="mb-4">
        <input
          type="url"
          className="w-full border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="Enter article URL (e.g., https://www.nytimes.com/...)"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Maximum words in summary</label>
        <div className="flex items-center">
          <input
            type="range"
            min="50"
            max="200"
            step="10"
            className="flex-1 mr-3"
            value={maxWords}
            onChange={e => setMaxWords(parseInt(e.target.value))}
          />
          <div className="w-12 text-center text-gray-700 font-medium">{maxWords}</div>
        </div>
      </div>

      <div className="flex justify-center mb-6">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-md transition duration-200 disabled:opacity-50"
        >
          {loading ? "Processing..." : "Summarize Article"}
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">{error}</div>}

      {result && (
        <div className="mt-4 space-y-4">
          <div className="bg-indigo-50 p-4 rounded-md border border-indigo-100">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">{result.jsonOutput.title}</h2>
            <div className="text-sm text-gray-500 mb-2">
              Source:{" "}
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline"
              >
                {result.url}
              </a>
            </div>
            <div className="text-sm text-gray-500 mb-2">Content length: {result.contentLength} characters</div>
          </div>

          <div className="border border-gray-200 rounded-md overflow-hidden">
            <div className="flex border-b border-gray-200">
              <button
                className={`flex-1 py-2 px-4 text-center ${
                  activeTab === "summary"
                    ? "bg-indigo-50 text-indigo-700 font-medium"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
                onClick={() => setActiveTab("summary")}
              >
                Summary
              </button>
              <button
                className={`flex-1 py-2 px-4 text-center ${
                  activeTab === "original"
                    ? "bg-indigo-50 text-indigo-700 font-medium"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
                onClick={() => setActiveTab("original")}
              >
                Original Content
              </button>
              <button
                className={`flex-1 py-2 px-4 text-center ${
                  activeTab === "json"
                    ? "bg-indigo-50 text-indigo-700 font-medium"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
                onClick={() => setActiveTab("json")}
              >
                JSON Output
              </button>
            </div>

            <div className="p-4 bg-white">
              {activeTab === "summary" && (
                <div className="relative">
                  <div className="prose prose-sm max-w-none">{result.jsonOutput.summary}</div>
                  <div className="absolute top-0 right-0">
                    <button
                      onClick={() => copyToClipboard(result.jsonOutput.summary, "summary")}
                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-md transition duration-200"
                    >
                      {copied === "summary" ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "original" && (
                <div className="relative">
                  <div className="prose prose-sm max-w-none max-h-96 overflow-y-auto whitespace-pre-line">
                    {result.originalContent}
                  </div>
                  <div className="absolute top-0 right-0">
                    <button
                      onClick={() => copyToClipboard(result.originalContent, "original")}
                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-md transition duration-200"
                    >
                      {copied === "original" ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "json" && (
                <div className="relative">
                  <div className="font-mono text-sm bg-gray-50 p-4 rounded-md max-h-96 overflow-y-auto">
                    <pre>{JSON.stringify(result.jsonOutput, null, 2)}</pre>
                  </div>
                  <div className="absolute top-0 right-0 m-4">
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(result.jsonOutput, null, 2), "json")}
                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-md transition duration-200"
                    >
                      {copied === "json" ? "Copied!" : "Copy JSON"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-md border border-green-100">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-700">
                Word count: Approximately {result.jsonOutput.summary.split(/\s+/).length} words (max: {maxWords})
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArticleSummarizer;
