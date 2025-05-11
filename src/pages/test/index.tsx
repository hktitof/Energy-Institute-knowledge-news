// app/prompt-test/page.tsx
"use client";

import React, { useState, useEffect, FormEvent, Component, ErrorInfo, ReactNode } from 'react';
import useLocalStoragePrompts from '@/hooks/useLocalStoragePrompts'; // Adjust path

// --- Simple Error Boundary (defined in the same file) ---
interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackMessage?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class InlineErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: "",
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in InlineErrorBoundary:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-5 m-5 text-red-700 bg-red-100 border-2 border-red-500 rounded-md">
          <h1 className="text-2xl font-bold mb-2">Something went wrong!</h1>
          <p className="mb-1">{this.props.fallbackMessage || "An unexpected error occurred."}</p>
          {this.state.errorMessage && (
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer">Error Details</summary>
              <pre className="mt-1 p-2 bg-red-50 rounded overflow-auto">{this.state.errorMessage}</pre>
            </details>
          )}
          <button
            onClick={() => this.setState({ hasError: false, errorMessage: '' })}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Helper Component for Form Fields ---
interface FormFieldProps {
  label: string;
  id: string;
  children: React.ReactNode;
}
const FormField: React.FC<FormFieldProps> = ({ label, id, children }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    {children}
  </div>
);


// --- The Main Form Content Component ---
function PromptTestFormContent() {
  const {
    articlePromptSettings,
    summaryOfSummaryPromptSettings,
    updateArticlePromptSettings,
    updateSummaryOfSummaryPromptSettings,
  } = useLocalStoragePrompts(); // This might throw if LS is not set up

  // Article Prompts State
  const [artSys, setArtSys] = useState('');
  const [artUser, setArtUser] = useState('');
  const [artWords, setArtWords] = useState('');

  // SoS Prompts State
  const [sosSys, setSosSys] = useState('');
  const [sosUser, setSosUser] = useState('');
  const [sosWords, setSosWords] = useState('');

  useEffect(() => {
    if (articlePromptSettings) { // Add null check for safety, though hook should provide or throw
        setArtSys(articlePromptSettings.systemPrompt);
        setArtUser(articlePromptSettings.userPrompt);
        setArtWords(String(articlePromptSettings.maxWords));
    }
  }, [articlePromptSettings]);

  useEffect(() => {
    if (summaryOfSummaryPromptSettings) { // Add null check
        setSosSys(summaryOfSummaryPromptSettings.systemPrompt);
        setSosUser(summaryOfSummaryPromptSettings.userPrompt);
        setSosWords(String(summaryOfSummaryPromptSettings.maxWords));
    }
  }, [summaryOfSummaryPromptSettings]);

  const handleSaveArticle = (e: FormEvent) => {
    e.preventDefault();
    updateArticlePromptSettings({
      systemPrompt: artSys,
      userPrompt: artUser,
      maxWords: parseInt(artWords, 10) || 0,
    });
    alert('Article Prompts Updated in LocalStorage!');
  };

  const handleSaveSoS = (e: FormEvent) => {
    e.preventDefault();
    updateSummaryOfSummaryPromptSettings({
      systemPrompt: sosSys,
      userPrompt: sosUser,
      maxWords: parseInt(sosWords, 10) || 0,
    });
    alert('Summary of Summaries Prompts Updated in LocalStorage!');
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-10">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">LocalStorage Prompts Test Page</h1>
        <p className="text-gray-600 mt-2">
          Edit and save prompt settings. Check your browser&apos;s LocalStorage (Application tab) to see changes.
        </p>
      </header>

      {/* Article Summary Settings Form */}
      <form onSubmit={handleSaveArticle} className="p-6 bg-white shadow-lg rounded-lg border border-gray-200 space-y-6">
        <h2 className="text-2xl font-semibold text-gray-700 border-b pb-3 mb-6">Article Summary Settings</h2>
        <FormField label="System Prompt:" id="artSys">
          <textarea id="artSys" value={artSys} onChange={(e) => setArtSys(e.target.value)} rows={3}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </FormField>
        <FormField label="User Prompt:" id="artUser">
          <textarea id="artUser" value={artUser} onChange={(e) => setArtUser(e.target.value)} rows={5}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </FormField>
        <FormField label="Max Words:" id="artWords">
          <input type="number" id="artWords" value={artWords} onChange={(e) => setArtWords(e.target.value)}
            className="block w-28 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </FormField>
        <button type="submit"
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          Save Article Settings
        </button>
      </form>

      {/* Summary of Summaries Settings Form */}
      <form onSubmit={handleSaveSoS} className="p-6 bg-white shadow-lg rounded-lg border border-gray-200 space-y-6">
        <h2 className="text-2xl font-semibold text-gray-700 border-b pb-3 mb-6">Summary of Summaries Settings</h2>
        <FormField label="System Prompt:" id="sosSys">
          <textarea id="sosSys" value={sosSys} onChange={(e) => setSosSys(e.target.value)} rows={3}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </FormField>
        <FormField label="User Prompt:" id="sosUser">
          <textarea id="sosUser" value={sosUser} onChange={(e) => setSosUser(e.target.value)} rows={5}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </FormField>
        <FormField label="Max Words:" id="sosWords">
          <input type="number" id="sosWords" value={sosWords} onChange={(e) => setSosWords(e.target.value)}
            className="block w-28 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
        </FormField>
        <button type="submit"
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          Save SoS Settings
        </button>
      </form>

      {/* Display Current Settings */}
      <div className="mt-10 p-6 bg-gray-50 shadow-md rounded-lg border border-gray-200">
        <h3 className="text-xl font-semibold text-gray-700 mb-4">Current Settings (from Hook state):</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-600">Article Summary:</h4>
            <pre className="p-3 bg-gray-100 rounded-md text-sm text-gray-800 overflow-x-auto whitespace-pre-wrap break-all">
              {JSON.stringify(articlePromptSettings, null, 2)}
            </pre>
          </div>
          <div>
            <h4 className="font-medium text-gray-600">Summary of Summaries:</h4>
            <pre className="p-3 bg-gray-100 rounded-md text-sm text-gray-800 overflow-x-auto whitespace-pre-wrap break-all">
              {JSON.stringify(summaryOfSummaryPromptSettings, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}


// --- The Page Component that exports default and uses the Error Boundary ---
export default function PromptTestPage() {
  return (
    <InlineErrorBoundary
      fallbackMessage="Failed to load prompt settings from LocalStorage. Please ensure 'promptSettings_article_summary' and 'promptSettings_summary_of_summary' are correctly populated with valid JSON in your browser's LocalStorage. Check console for details."
    >
      <PromptTestFormContent />
    </InlineErrorBoundary>
  );
}