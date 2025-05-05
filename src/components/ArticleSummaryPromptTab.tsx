import { usePrompts } from "@/hooks/usePrompts";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { default_single_article_systemPrompt, default_single_article_userPromptInstructions } from "../utils/utils";

export default function ArticleSummaryPromptTab() {
  const {
    systemPrompt,
    userPrompt,
    setSystemPrompt,
    setUserPrompt,
    isLoadingFetch,
    isUpdating,
    fetchError,
    isUpdateSuccess,
    savePrompts,
    resetUpdateStatus,
  } = usePrompts("article_summary");

  const [isEdited, setIsEdited] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // ### Modified from HERE !! ###
  const [showSaveSuccess, setShowSaveSuccess] = useState(false); // State for save confirmation
  // ### END OF MODIFICATION !!! ###

  const isAtInitialDefault =
    articleSystemPrompt === default_single_article_systemPrompt &&
    articleUserPrompt === default_single_article_userPromptInstructions;

  // Handle save
  const handleSave = () => {
    onSavePrompts(articleSystemPrompt, articleUserPrompt);
    setIsEdited(false);

    // ### Modified from HERE !! ###
    setShowSaveSuccess(true); // Show confirmation
    // Hide confirmation after a delay
    setTimeout(() => {
      setShowSaveSuccess(false);
    }, 2500); // Hide after 2.5 seconds
    // ### END OF MODIFICATION !!! ###
  };

  const handleReset = () => {
    setArticleSystemPrompt(default_single_article_systemPrompt);
    setArticleUserPrompt(default_single_article_userPromptInstructions);
    setIsEdited(false);
    setShowResetConfirm(false);

    // ### Modified from HERE !! ###
    setShowSaveSuccess(false); // Ensure save confirmation is hidden on reset
    // ### END OF MODIFICATION !!! ###
  };
  return (
    <>
      {/* Modal Content Area */}
      <div className="flex-1 overflow-y-auto p-6 pt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key="article-summary"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <h3 className="text-blue-700 text-sm font-medium mb-2">What are these prompts?</h3>
              <p className="text-blue-600 text-sm">
                These prompts control how the AI interprets and summarizes article content. The system prompt defines
                the AI&apos;s capabilities, while the user instructions provide specific guidance for the summarization
                task.
              </p>
            </div>

            {/* System Prompt */}
            <div>
              {/* ... label and character count ... */}
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="articleSystemPrompt" className="block text-sm font-medium text-gray-700">
                  System Prompt <span className="text-gray-500">(AI&apos;s Base Capability)</span>
                </label>
                <span className="text-xs text-gray-500">{articleSystemPrompt.length} characters</span>
              </div>
              <textarea
                id="articleSystemPrompt"
                rows={5}
                className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
                value={articleSystemPrompt}
                onChange={e => {
                  setArticleSystemPrompt(e.target.value);
                  setIsEdited(true);
                  // ### Modified from HERE !! ###
                  setShowSaveSuccess(false); // Hide success msg if user edits again
                  // ### END OF MODIFICATION !!! ###
                }}
                placeholder="Define the AI's role and capabilities here..."
              />
              {/* ... helper text ... */}
              <p className="mt-1 text-xs text-gray-500">
                This defines what the AI understands about its role and capabilities.
              </p>
            </div>

            {/* User Instructions */}
            <div>
              {/* ... label and character count ... */}
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="articleUserPrompt" className="block text-sm font-medium text-gray-700">
                  User Instructions <span className="text-gray-500">(Task-Specific Guidelines)</span>
                </label>
                <span className="text-xs text-gray-500">{articleUserPrompt.length} characters</span>
              </div>
              <textarea
                id="articleUserPrompt"
                rows={12}
                className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
                value={articleUserPrompt}
                onChange={e => {
                  setArticleUserPrompt(e.target.value);
                  setIsEdited(true);
                  // ### Modified from HERE !! ###
                  setShowSaveSuccess(false); // Hide success msg if user edits again
                  // ### END OF MODIFICATION !!! ###
                }}
                placeholder="Provide specific instructions for the article summarization task..."
              />
              {/* ... helper text ... */}
              <p className="mt-1 text-xs text-gray-500">
                Special variables like <code className="bg-gray-100 px-1 rounded">${`{title}`}</code> and{" "}
                <code className="bg-gray-100 px-1 rounded">${`{textContent}`}</code> will be replaced with actual
                article data at runtime.
              </p>
            </div>

            {/* Template Variables Helper */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              {/* ... variables list ... */}
              <h3 className="text-gray-700 text-sm font-medium mb-2">Available Template Variables</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="flex items-center">
                  <code className="bg-gray-200 px-2 py-1 rounded text-sm">${`{title}`}</code>
                  <span className="ml-2 text-sm text-gray-600">Article title</span>
                </div>
                <div className="flex items-center">
                  <code className="bg-gray-200 px-2 py-1 rounded text-sm">${`{textContent}`}</code>
                  <span className="ml-2 text-sm text-gray-600">Full article text</span>
                </div>
                <div className="flex items-center">
                  <code className="bg-gray-200 px-2 py-1 rounded text-sm">${`{maxWords}`}</code>
                  <span className="ml-2 text-sm text-gray-600">Maximum summary length</span>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}
