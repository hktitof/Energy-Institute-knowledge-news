import { useState } from "react";
import { Copy, Check, Edit, ExternalLink, AlertCircle, Link, FileText, X } from "lucide-react";

// Define proper types for the API response
interface SummaryResult {
  success: true;
  url?: string;
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

const ArticleSummarizerTab = ({
  setActiveParentTab,
}: {
  setActiveParentTab: (tab: string | null) => void;
  activeParentTab: string | null;
}) => {
  const [url, setUrl] = useState("");
  const [pastedContent, setPastedContent] = useState("");
  const [pastedTitle, setPastedTitle] = useState("");
  const [maxWords, setMaxWords] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [activeTab, setActiveTab] = useState<"summary" | "original" | "template">("summary");
  const [copied, setCopied] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [inputMethod, setInputMethod] = useState<"url" | "paste">("url");
  const [summaryPrompt, setSummaryPrompt] = useState(
    `Create a concise summary (maximum #words# words) of the following article. Focus only on the key information, main arguments, and essential details. The summary should be professional and focused without any introductory phrases like "This article discusses" or "Summary:".

Article title: #title#
Article content: #article_content#

Return your response as a JSON object with this exact format:
{
  "title": "The exact article title",
  "summary": "The concise summary of the article"
}`
  );

  const validateUrl = (url: string) => {
    // Basic URL validation
    try {
      const parsedUrl = new URL(url.trim());
      return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("URL validation error:", error.message);
      } else {
        console.error("Unknown URL validation error");
      }
      return false;
    }
  };

  const handleSubmit = async () => {
    // Reset states
    setError("");
    setResult(null);
    setCopied(null);

    if (inputMethod === "url") {
      // URL-based extraction and summarization
      // Trim and validate URL
      const trimmedUrl = url.trim();
      if (!trimmedUrl) {
        setError("Please enter a URL");
        return;
      }

      if (!validateUrl(trimmedUrl)) {
        setError("Please enter a valid URL starting with http:// or https://");
        return;
      }

      setLoading(true);

      try {
        const response = await fetch("/api/extract-and-summarize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: trimmedUrl,
            maxWords,
            // Replace placeholders in prompt
            promptTemplate: summaryPrompt
              .replace("#words#", maxWords.toString())
              .replace("#article_content#", "#content#"), // Will be replaced by API
          }),
        });

        const data = (await response.json()) as ApiResponse;

        if (data.success) {
          setResult(data);
        } else {
          setError(data.error || "Failed to process article");
        }
      } catch (error) {
        console.error("Error:", error);
        setError("An error occurred while processing your request");
      } finally {
        setLoading(false);
      }
    } else {
      // Pasted content summarization
      if (!pastedContent.trim()) {
        setError("Please paste some content to summarize");
        return;
      }

      setLoading(true);

      try {
        const response = await fetch("/api/summarize-text", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            textContent: pastedContent.trim(),
            title: pastedTitle.trim() || undefined,
            maxWords,
            promptTemplate: summaryPrompt.replace("#words#", maxWords.toString()).replace("#title#", pastedTitle || ""),
          }),
        });

        const data = (await response.json()) as ApiResponse;

        if (data.success) {
          setResult(data);
        } else {
          setError(data.error || "Failed to summarize content");
        }
      } catch (error) {
        console.error("Error:", error);
        setError("An error occurred while processing your request");
      } finally {
        setLoading(false);
      }
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  // Function to get JSON string for copying

  // Function to remove JSON formatting
  const removeJsonString = (text: string) => {
    // This will handle various JSON formatting patterns
    return text
      .replace(/^```json\s*/, "") // Remove opening ```json
      .replace(/\s*```$/, "") // Remove closing ```
      .replace(/^\s*{\s*"title":\s*"[^"]*",\s*"summary":\s*"/, "") // Remove opening JSON structure
      .replace(/"\s*}\s*$/, ""); // Remove closing JSON structure
  };

  return (
    <div className="w-full max-w-4xl bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <div className="flex justify-between">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Article Summarizer</h1>
          <button
            onClick={() => setActiveParentTab(null)}
            className="bg-gray-400 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded hover:cursor-pointer"
          >
            <X size={16} className="mr-1" />
            {/* Close */}
          </button>
        </div>
        <p className="text-gray-600">Extract and summarize content from any article URL or pasted text</p>
      </div>

      {/* Input Method Tabs */}
      <div className="mb-4 border-b border-gray-200">
        <div className="flex -mb-px">
          <button
            onClick={() => setInputMethod("url")}
            className={`py-2 px-4 border-b-2 font-medium text-sm flex items-center ${
              inputMethod === "url"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Link size={16} className="mr-2" />
            URL Input
          </button>
          <button
            onClick={() => setInputMethod("paste")}
            className={`py-2 px-4 border-b-2 font-medium text-sm flex items-center ${
              inputMethod === "paste"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <FileText size={16} className="mr-2" />
            Paste Content
          </button>
        </div>
      </div>

      {/* URL Input Section */}
      {inputMethod === "url" && (
        <div className="mb-6">
          <label htmlFor="urlInput" className="block text-sm font-medium text-gray-700 mb-2">
            Article URL
          </label>
          <div className="flex items-center">
            <input
              id="urlInput"
              type="url"
              className="flex-1 border border-gray-300 rounded-l-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com/article"
            />
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-r-md transition duration-200 disabled:opacity-50 hover:cursor-pointer"
            >
              {loading ? "Processing..." : "Summarize"}
            </button>
          </div>
          {error && inputMethod === "url" && (
            <div className="mt-2 flex items-center text-red-600 text-sm">
              <AlertCircle size={16} className="mr-1" />
              {error}
            </div>
          )}
        </div>
      )}

      {/* Paste Content Section */}
      {inputMethod === "paste" && (
        <div className="mb-6">
          <div className="mb-4">
            <label htmlFor="pastedTitle" className="block text-sm font-medium text-gray-700 mb-2">
              Title (Optional)
            </label>
            <input
              id="pastedTitle"
              type="text"
              className="w-full border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={pastedTitle}
              onChange={e => setPastedTitle(e.target.value)}
              placeholder="Enter a title for the content"
            />
          </div>

          <label htmlFor="pastedContent" className="block text-sm font-medium text-gray-700 mb-2">
            Content
          </label>
          <div className="relative">
            <textarea
              id="pastedContent"
              className="w-full border border-gray-300 rounded-md p-3 h-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={pastedContent}
              onChange={e => setPastedContent(e.target.value)}
              placeholder="Paste article content here..."
            />
            <div className="absolute bottom-2 right-2 text-xs text-gray-500">{pastedContent.length} characters</div>
          </div>
          <div className="flex justify-end mt-3">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md transition duration-200 disabled:opacity-50 hover:cursor-pointer"
            >
              {loading ? "Processing..." : "Summarize"}
            </button>
          </div>
          {error && inputMethod === "paste" && (
            <div className="mt-2 flex items-center text-red-600 text-sm">
              <AlertCircle size={16} className="mr-1" />
              {error}
            </div>
          )}
        </div>
      )}

      {/* Options Section */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Word Count: {maxWords}</label>
          <input
            type="range"
            min="50"
            max="250"
            step="10"
            className="w-full"
            value={maxWords}
            onChange={e => setMaxWords(parseInt(e.target.value))}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>50</span>
            <span>150</span>
            <span>250</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      {(result || loading) && (
        <div className="border border-gray-200 rounded-md overflow-hidden mb-6">
          <div className="flex border-b border-gray-200">
            <button
              className={`flex-1 py-2 px-4 text-center text-sm ${
                activeTab === "summary"
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
              onClick={() => setActiveTab("summary")}
            >
              Summary
            </button>
            <button
              className={`flex-1 py-2 px-4 text-center text-sm ${
                activeTab === "original"
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
              onClick={() => setActiveTab("original")}
            >
              Original Content
            </button>
            <button
              className={`flex-1 py-2 px-4 text-center text-sm ${
                activeTab === "template"
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
              onClick={() => setActiveTab("template")}
            >
              Prompt Template
            </button>
          </div>

          {/* Tab Content */}
          <div className="min-h-[200px]">
            {loading && (
              <div className="flex items-center justify-center h-full py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            )}

            {!loading && result && activeTab === "summary" && (
              <div className="p-5 bg-white animate-fadeIn">
                <div className="bg-blue-50 p-4 rounded-md border border-blue-100 mb-4">
                  <h2 className="text-xl font-semibold text-gray-800 mb-1">{result.jsonOutput.title}</h2>
                  {result.url && (
                    <div className="text-sm text-gray-500">
                      Source:{" "}
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline inline-flex items-center"
                      >
                        {result.url.length > 50 ? result.url.substring(0, 50) + "..." : result.url}
                        <ExternalLink size={12} className="ml-1" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Copy options below summary */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="bg-green-50 p-3 rounded-md border border-green-100 flex items-center">
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-700">
                      Word count: Approximately {result.jsonOutput.summary.split(/\s+/).length} words (max: {maxWords})
                    </span>
                  </div>
                </div>

                {/* Title and Summary display section */}
                <div className="mt-4 bg-white rounded-md border border-gray-200 p-4">
                  <div className="mb-3">
                    <div className="text-sm font-medium text-gray-500 mb-1">Title</div>
                    <div className="text-gray-800">{result.jsonOutput.title}</div>
                    <button
                      onClick={() => copyToClipboard(result.jsonOutput.title, "title-only")}
                      className="mt-1 text-xs px-2 py-1 rounded-md inline-flex items-center text-gray-600 hover:bg-gray-100 border border-gray-200"
                    >
                      {copied === "title-only" ? (
                        <Check size={12} className="mr-1" />
                      ) : (
                        <Copy size={12} className="mr-1" />
                      )}
                      {copied === "title-only" ? "Copied" : "Copy"}
                    </button>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-1">Summary</div>
                    <div className="text-gray-800">{removeJsonString(result.jsonOutput.summary)}</div>
                    <button
                      onClick={() => copyToClipboard(removeJsonString(result.jsonOutput.summary), "summary-only")}
                      className="mt-1 text-xs px-2 py-1 rounded-md inline-flex items-center text-gray-600 hover:bg-gray-100 border border-gray-200"
                    >
                      {copied === "summary-only" ? (
                        <Check size={12} className="mr-1" />
                      ) : (
                        <Copy size={12} className="mr-1" />
                      )}
                      {copied === "summary-only" ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!loading && result && activeTab === "original" && (
              <div className="p-5 bg-white animate-fadeIn">
                <div className="relative">
                  <div className="prose prose-sm max-w-none max-h-96 overflow-y-auto p-4 bg-gray-50 rounded-md border border-gray-200 whitespace-pre-line">
                    {result.originalContent}
                  </div>
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={() => copyToClipboard(result.originalContent, "original")}
                      className="p-1.5 bg-white rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
                      title="Copy original content"
                    >
                      {copied === "original" ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-500">
                  Content length: {result.contentLength.toLocaleString()} characters
                </div>
              </div>
            )}

            {activeTab === "template" && (
              <div className="p-5 bg-white animate-fadeIn">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-800">Summary Prompt Template</h3>
                  <button
                    onClick={() => setEditingPrompt(!editingPrompt)}
                    className="text-blue-600 hover:text-blue-800 flex items-center text-sm font-medium px-3 py-1 rounded-md hover:bg-blue-50 transition-colors duration-200"
                  >
                    <Edit size={16} className="mr-1" />
                    {editingPrompt ? "Save" : "Edit"}
                  </button>
                </div>

                {editingPrompt ? (
                  <textarea
                    value={summaryPrompt}
                    onChange={e => setSummaryPrompt(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-36 text-sm"
                    placeholder="Enter your summary prompt template..."
                  />
                ) : (
                  <div className="p-4 bg-gray-50 rounded-md text-gray-700 border border-gray-100 text-sm whitespace-pre-wrap min-h-[9rem]">
                    {summaryPrompt}
                  </div>
                )}

                <div className="mt-4 p-4 bg-blue-50 rounded-md text-sm text-blue-700 border border-blue-100">
                  <p className="font-medium mb-2">Template Variables:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center p-2 bg-white rounded border border-blue-200">
                      <code className="bg-blue-100 px-2 py-1 rounded text-blue-800 font-mono text-xs">
                        #article_content#
                      </code>
                      <span className="ml-2 text-xs">Insert article content</span>
                    </div>
                    <div className="flex items-center p-2 bg-white rounded border border-blue-200">
                      <code className="bg-blue-100 px-2 py-1 rounded text-blue-800 font-mono text-xs">#words#</code>
                      <span className="ml-2 text-xs">Insert word count</span>
                    </div>
                    <div className="flex items-center p-2 bg-white rounded border border-blue-200">
                      <code className="bg-blue-100 px-2 py-1 rounded text-blue-800 font-mono text-xs">#title#</code>
                      <span className="ml-2 text-xs">Insert article title</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ArticleSummarizerTab;
