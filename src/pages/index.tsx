import ArticleSummarizer from "../components/ArticleSummarizer";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">Article Summarizer App</h1>
      <p className="text-gray-600 mb-8 max-w-lg text-center">
        Enter any article URL to extract and summarize its content in one click
      </p>
      <ArticleSummarizer />
    </div>
  );
}