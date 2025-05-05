import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePrompts } from "@/hooks/usePrompts";
import { default_single_article_systemPrompt, default_single_article_userPromptInstructions } from "../utils/utils";
import { Save, RotateCcw, AlertCircle, CheckCircle, Edit, Clock, Info } from "lucide-react";

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
  const [showInfoTip, setShowInfoTip] = useState(true);

  const isAtInitialDefault =
    systemPrompt === default_single_article_systemPrompt &&
    userPrompt === default_single_article_userPromptInstructions;

  // Auto-hide info tip after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowInfoTip(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

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
    // update the db using the hook
    handleSave();
    setIsEdited(false);
    setShowResetConfirm(false);
    setShowSaveSuccess(false);
    resetUpdateStatus();
  };

  if (isLoadingFetch) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading prompts...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 p-6">
        <AlertCircle size={36} className="text-red-500 mb-2" />
        <p className="text-red-600 font-medium mb-4">Error loading prompts</p>
        <p className="text-gray-600 mb-6 text-center max-w-md">{fetchError}</p>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-6 pt-4 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key="article-summary"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6 max-w-4xl mx-auto"
          >
            {/* Info Card - Auto-hide after a few seconds */}
            <AnimatePresence>
              {showInfoTip && (
                <motion.div
                  initial={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-100 shadow-sm">
                    <div className="flex items-start">
                      <Info className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <h3 className="text-blue-800 font-semibold mb-2">AI Summarization Configuration</h3>
                        <p className="text-blue-700 text-sm leading-relaxed">
                          These prompts control how the AI interprets and summarizes articles. Customize both the system
                          prompt (AI&apos;s capabilities) and user instructions (specific summarization guidance) to
                          achieve your desired summary style and format.
                        </p>
                      </div>
                      <button onClick={() => setShowInfoTip(false)} className="ml-3 text-blue-400 hover:text-blue-600">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* System Prompt */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <label htmlFor="systemPrompt" className="block font-medium text-gray-800">
                    System Prompt <span className="text-gray-500 text-sm font-normal">(AI&apos;s Base Capability)</span>
                  </label>
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                    {systemPrompt?.length || 0} characters
                  </span>
                </div>
              </div>
              <div className="p-4">
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
                <p className="mt-2 text-xs text-gray-500 flex items-center">
                  <Info className="h-3 w-3 mr-1" />
                  This defines what the AI understands about its role and capabilities.
                </p>
              </div>
            </div>

            {/* User Instructions */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <label htmlFor="userPrompt" className="block font-medium text-gray-800">
                    User Instructions{" "}
                    <span className="text-gray-500 text-sm font-normal">(Task-Specific Guidelines)</span>
                  </label>
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                    {userPrompt?.length || 0} characters
                  </span>
                </div>
              </div>
              <div className="p-4">
                <textarea
                  id="userPrompt"
                  rows={10}
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
                <p className="mt-2 text-xs text-gray-500 flex items-center">
                  <Info className="h-3 w-3 mr-1" />
                  Special variables like <code className="bg-gray-100 px-1 rounded">${`{title}`}</code> will be replaced
                  with actual article data.
                </p>
              </div>
            </div>

            {/* Template Variables Helper */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-gray-800 font-medium flex items-center mb-3">
                <span className="mr-2 p-1 bg-gray-200 rounded-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-gray-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </span>
                Available Template Variables
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded-lg border border-gray-200 flex items-center">
                  <code className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-sm font-mono">${`{title}`}</code>
                  <span className="ml-3 text-sm text-gray-600">Article title</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200 flex items-center">
                  <code className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-sm font-mono">
                    ${`{textContent}`}
                  </code>
                  <span className="ml-3 text-sm text-gray-600">Full article text</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200 flex items-center">
                  <code className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-sm font-mono">${`{maxWords}`}</code>
                  <span className="ml-3 text-sm text-gray-600">Maximum summary length</span>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Sticky Footer with buttons */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-md">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
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
                  <AlertCircle className="h-4 w-4 mr-1" />
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
                  <Edit className="h-4 w-4 mr-1" />
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
                  <CheckCircle className="h-4 w-4 mr-1" />
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
                  <Clock className="h-4 w-4 mr-1 animate-spin" />
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
                  className="text-sm text-red-600 mr-2 flex items-center font-medium"
                >
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Confirm reset?
                </motion.span>
                <button
                  className="px-4 py-2 border border-red-300 text-red-600 text-sm font-medium rounded-md hover:bg-red-50 transition-colors shadow-sm flex items-center"
                  onClick={handleReset}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Yes, reset
                </button>
                <button
                  className="px-4 py-2 border border-gray-300 text-gray-600 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors shadow-sm"
                  onClick={() => setShowResetConfirm(false)}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                {/* Reset Button */}
                <button
                  className={`px-4 py-2 border border-gray-300 text-gray-600 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors shadow-sm flex items-center ${
                    isAtInitialDefault ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  onClick={() => setShowResetConfirm(true)}
                  disabled={isAtInitialDefault || isUpdating}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset to Default
                </button>
                {/* Save Button with Tooltip Wrapper */}
                <div className="relative group">
                  <button
                    className={`px-4 py-2 text-white text-sm font-medium rounded-md shadow-sm transition-colors flex items-center ${
                      isEdited && !isUpdating ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-400 cursor-not-allowed"
                    }`}
                    onClick={handleSave}
                    disabled={!isEdited || isUpdating}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isUpdating ? "Saving..." : "Save Changes"}
                  </button>
                  {!isEdited && !showSaveSuccess && (
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                      No changes to save
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
