import { useState } from "react";
import axios from "axios";

interface ExtractedContent {
  success: true;
  url: string;
  title: string;
  textContent: string;
  length: number;
}

interface ErrorResponse {
  success: false;
  error: string;
}

const ArticleExtractor = () => {
  const [url, setUrl] = useState("");
  const [extractedContent, setExtractedContent] = useState<ExtractedContent | null>(null);
  const [promptText, setPromptText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleExtract = async () => {
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
    setCopied(false);
    setExtractedContent(null);
    setPromptText("");

    try {
      const res = await axios.post<ExtractedContent | ErrorResponse>("/api/extract-article", { url });

      if (res.data.success) {
        setExtractedContent(res.data);

        // Generate a clean prompt with JSON format requirement
        const prompt = `Article from: ${url}

Title: ${res.data.title}

Please analyze the following article content and provide a summary. 
Return your response as a JSON object with the following format:
{
  "title": "The title of the article",
  "summary": "Your comprehensive summary of the article"
}

Article content:
${res.data.textContent}`;

        setPromptText(prompt);
      } else {
        setError((res.data as ErrorResponse).error || "Failed to extract article");
      }
    } catch (error) {
      console.error(error);
      setError("Failed to extract article. Please check the URL and try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string): void => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-6 mt-8">
      <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">Article Extractor</h1>

      <div className="mb-4">
        <input
          type="url"
          className="w-full border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="Enter article URL (e.g., https://www.nature.com/articles/...)"
        />
      </div>

      <div className="flex justify-center mb-6">
        <button
          onClick={handleExtract}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-md transition duration-200 disabled:opacity-50"
        >
          {loading ? "Extracting..." : "Extract Article"}
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">{error}</div>}

      {extractedContent && (
        <div className="mt-4 space-y-4">
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Extracted Article:</h2>
            <div className="mb-2">
              <strong>Title:</strong> {extractedContent.title}
            </div>
            <div className="mb-2">
              <strong>Content Length:</strong> {extractedContent.length} characters
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => copyToClipboard(extractedContent.textContent)}
                className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-md transition duration-200"
              >
                Copy Full Content
              </button>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-semibold text-gray-800">AI Prompt:</h2>
              <button
                onClick={() => copyToClipboard(promptText)}
                className="text-sm bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded-md transition duration-200"
              >
                {copied ? "Copied!" : "Copy Prompt"}
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              <pre className="text-gray-700 whitespace-pre-wrap text-sm">{promptText}</pre>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-md border border-gray-200 max-h-64 overflow-y-auto">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Article Preview:</h2>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap">{extractedContent.textContent}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArticleExtractor;
