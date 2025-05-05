import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePrompts } from "@/hooks/usePrompts";
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
    updateError,
    isUpdateSuccess,
    savePrompts,
    resetUpdateStatus,
  } = usePrompts("article_summary");

  const [isEdited, setIsEdited] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  const isAtInitialDefault =
    systemPrompt === default_single_article_systemPrompt &&
    userPrompt === default_single_article_userPromptInstructions;

  // Handle save
  const handleSave = async () => {
    await savePrompts();
    setIsEdited(false);
    setShowSaveSuccess(true);

    // Hide confirmation after a delay
    setTimeout(() => {
      setShowSaveSuccess(false);
      resetUpdateStatus(); // Reset success/error state in hook
    }, 2500);
  };

  const handleReset = () => {
    setSystemPrompt(default_single_article_systemPrompt);
    setUserPrompt(default_single_article_userPromptInstructions);
    setIsEdited(false);
    setShowResetConfirm(false);
    setShowSaveSuccess(false);
    resetUpdateStatus();
  };

  if (isLoadingFetch) {
    return <div className="p-6 text-center">Loading prompts...</div>;
  }

  if (fetchError) {
    return (
      <div className="p-6 text-center text-red-600">
        <p>Error loading prompts: {fetchError}</p>
        <button
          className="mt-4 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

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
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="systemPrompt" className="block text-sm font-medium text-gray-700">
                  System Prompt <span className="text-gray-500">(AI&apos;s Base Capability)</span>
                </label>
                <span className="text-xs text-gray-500">{systemPrompt?.length || 0} characters</span>
              </div>
              <textarea
                id="systemPrompt"
                rows={5}
                className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
                value={systemPrompt || ""}
                onChange={e => {
                  setSystemPrompt(e.target.value);
                  setIsEdited(true);
                  setShowSaveSuccess(false);
                  resetUpdateStatus();
                }}
                placeholder="Define the AI's role and capabilities here..."
              />
              <p className="mt-1 text-xs text-gray-500">
                This defines what the AI understands about its role and capabilities.
              </p>
            </div>

            {/* User Instructions */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="userPrompt" className="block text-sm font-medium text-gray-700">
                  User Instructions <span className="text-gray-500">(Task-Specific Guidelines)</span>
                </label>
                <span className="text-xs text-gray-500">{userPrompt?.length || 0} characters</span>
              </div>
              <textarea
                id="userPrompt"
                rows={12}
                className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
                value={userPrompt || ""}
                onChange={e => {
                  setUserPrompt(e.target.value);
                  setIsEdited(true);
                  setShowSaveSuccess(false);
                  resetUpdateStatus();
                }}
                placeholder="Provide specific instructions for the article summarization task..."
              />
              <p className="mt-1 text-xs text-gray-500">
                Special variables like <code className="bg-gray-100 px-1 rounded">${`{title}`}</code> and{" "}
                <code className="bg-gray-100 px-1 rounded">${`{textContent}`}</code> will be replaced with actual
                article data at runtime.
              </p>
            </div>

            {/* Template Variables Helper */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
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

            {/* Footer with error/success messages and buttons */}
            <div className="border-t border-gray-200 pt-4 mt-6 flex justify-between items-center">
              {/* Left side: Status Indicators */}
              <div className="flex items-center h-5">
                <AnimatePresence>
                  {updateError && (
                    <motion.span
                      key="error"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm text-red-600 flex items-center"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                      {updateError}
                    </motion.span>
                  )}
                  {isEdited && !showSaveSuccess && !updateError && (
                    <motion.span
                      key="unsaved"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm text-blue-600 flex items-center"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                      Unsaved changes
                    </motion.span>
                  )}
                  {showSaveSuccess && (
                    <motion.span
                      key="saved"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm text-green-600 flex items-center"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      Saved successfully!
                    </motion.span>
                  )}
                  {isUpdating && (
                    <motion.span
                      key="saving"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm text-blue-600 flex items-center"
                    >
                      <svg
                        className="animate-spin h-4 w-4 mr-1"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Saving...
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              {/* Right side: Action Buttons */}
              <div className="flex space-x-3">
                {showResetConfirm ? (
                  <>
                    <motion.span
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-sm text-red-600 mr-2 flex items-center"
                    >
                      Confirm reset?
                    </motion.span>
                    <button
                      className="px-3 py-1 border border-red-300 text-red-600 text-sm font-medium rounded hover:bg-red-50 transition-colors"
                      onClick={handleReset}
                    >
                      Yes, reset
                    </button>
                    <button
                      className="px-3 py-1 border border-gray-300 text-gray-600 text-sm font-medium rounded hover:bg-gray-50 transition-colors"
                      onClick={() => setShowResetConfirm(false)}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    {/* Reset Button */}
                    <button
                      className={`px-3 py-1 border border-gray-300 text-gray-600 text-sm font-medium rounded hover:bg-gray-50 transition-colors ${
                        isAtInitialDefault ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      onClick={() => setShowResetConfirm(true)}
                      disabled={isAtInitialDefault || isUpdating}
                    >
                      Reset to Default
                    </button>
                    {/* Save Button with Tooltip Wrapper */}
                    <div className="relative group">
                      <button
                        className={`px-4 py-1 text-white text-sm font-medium rounded transition-colors ${
                          isEdited && !isUpdating ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-400 cursor-not-allowed"
                        }`}
                        onClick={handleSave}
                        disabled={!isEdited || isUpdating}
                      >
                        {isUpdating ? "Saving..." : "Save Changes"}
                      </button>
                      {!isEdited && !showSaveSuccess && (
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs px-2 py-1 bg-gray-700 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                          No changes to save
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}
