import { useState } from "react";
import axios from "axios";

export default function Home() {
  const [text, setText] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!text.trim()) {
      setError("Please enter some text to summarize");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await axios.post("/api/summarize", { text });
      setResponse(res.data.summary);
    } catch (error) {
      console.error(error);
      setError("Failed to get summary. Please try again.");
      setResponse("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">Text Summarizer</h1>

        <div className="mb-4">
          <textarea
            className="w-full border border-gray-300 rounded-md p-3 h-40 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Enter text to summarize..."
          />
        </div>

        <div className="flex justify-center mb-6">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md transition duration-200 disabled:opacity-50"
          >
            {loading ? "Summarizing..." : "Summarize"}
          </button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">{error}</div>}

        {response && (
          <div className="mt-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Summary:</h2>
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <p className="text-gray-700">{response}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
