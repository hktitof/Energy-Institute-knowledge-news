import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { default_single_article_systemPrompt, default_single_article_userPromptInstructions } from "../utils/utils";

const SettingsModal = ({
  setActiveTab,
  defaultSystemPrompt = default_single_article_systemPrompt,
  defaultUserPromptInstructions = default_single_article_userPromptInstructions,
  onSavePrompts,
  articleUserPrompt,
  setArticleUserPrompt,
  setArticleSystemPrompt,
  articleSystemPrompt,
}: {
  articleUserPrompt: string;
  setArticleUserPrompt: (prompt: string) => void;
  setArticleSystemPrompt: (prompt: string) => void;
  articleSystemPrompt: string;
  setActiveTab: (tab: string | null) => void;
  defaultSystemPrompt?: string;
  defaultUserPromptInstructions?: string;
  onSavePrompts: (prompts: { articleSystemPrompt: string; articleUserPrompt: string }) => void;
}) => {
  const [activeSettingsTab, setActiveSettingsTab] = useState("article-summary");
 
  const [isEdited, setIsEdited] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // ### Modified from HERE !! ###
  const [showSaveSuccess, setShowSaveSuccess] = useState(false); // State for save confirmation
  // ### END OF MODIFICATION !!! ###

  const isAtInitialDefault =
    articleSystemPrompt === default_single_article_systemPrompt && articleUserPrompt === default_single_article_userPromptInstructions;

  // Remove effect if parent never passes these props
  useEffect(() => {
    if (defaultSystemPrompt) setArticleSystemPrompt(defaultSystemPrompt);
    if (defaultUserPromptInstructions) setArticleUserPrompt(defaultUserPromptInstructions);
  }, [defaultSystemPrompt, defaultUserPromptInstructions]);

  // Handle save
  const handleSave = () => {
    onSavePrompts({
      articleSystemPrompt,
      articleUserPrompt,
    });
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
      {/* Backdrop overlay */}
      <motion.div
        className="fixed inset-0 bg-black opacity-50 z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        exit={{ opacity: 0 }}
      />

      {/* Modal content */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          className="bg-white rounded-lg shadow-xl w-full px-16 py-8 p-0 relative max-h-[85vh] overflow-hidden flex flex-col"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 400 }}
        >
          {/* Modal Header */}
          <div className="p-6 pb-0">
            {/* ... header content (title, close button, tabs) ... */}
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-2xl font-semibold text-gray-800">Settings</h2>
              <button
                className="text-gray-400 hover:text-gray-600 transition-colors"
                onClick={() => {
                  setActiveTab(null);
                }}
                aria-label="Close settings"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 border-b border-gray-200">
              <button
                className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
                  activeSettingsTab === "article-summary"
                    ? "bg-blue-50 text-blue-600 border-b-2 border-blue-500"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveSettingsTab("article-summary")}
              >
                Single Article Summary Prompt
              </button>
              <button
                className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
                  activeSettingsTab === "tab2"
                    ? "bg-blue-50 text-blue-600 border-b-2 border-blue-500"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveSettingsTab("tab2")}
              >
                Tab 2
              </button>
            </div>
          </div>

          {/* Modal Content Area */}
          <div className="flex-1 overflow-y-auto p-6 pt-4">
            <AnimatePresence mode="wait">
              {activeSettingsTab === "article-summary" && (
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
                      These prompts control how the AI interprets and summarizes article content. The system prompt
                      defines the AI&apos;s capabilities, while the user instructions provide specific guidance for the
                      summarization task.
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
              )}

              {activeSettingsTab === "tab2" && (
                <motion.div /* ... Tab 2 content ... */>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                    <h3 className="text-lg font-medium text-gray-700 mb-2">Tab 2 Content</h3>
                    <p className="text-gray-500">Additional settings will be available here.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Modal Footer */}
          <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-between items-center">
            {/* ### Modified from HERE !! ### */}
            {/* Left side: Status Indicators */}
            <div className="flex items-center h-5">
              {" "}
              {/* Container to prevent layout shift */}
              <AnimatePresence>
                {isEdited &&
                  !showSaveSuccess && ( // Show only if edited and save not just clicked
                    <motion.span
                      key="unsaved"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm text-blue-600 flex items-center"
                    >
                      <svg
                        /* ... edit icon ... */ xmlns="http://www.w3.org/2000/svg"
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
                      /* ... check icon ... */ xmlns="http://www.w3.org/2000/svg"
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
              </AnimatePresence>
            </div>
            {/* ### END OF MODIFICATION !!! ### */}

            {/* Right side: Action Buttons */}
            <div className="flex space-x-3">
              {showResetConfirm ? (
                <>
                  {" "}
                  {/* Reset Confirmation Buttons */}
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
                  {" "}
                  {/* Default Action Buttons */}
                  {/* Reset Button */}
                  <button
                    className={`px-3 py-1 border border-gray-300 text-gray-600 text-sm font-medium rounded hover:bg-gray-50 transition-colors ${
                      isAtInitialDefault ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    onClick={() => setShowResetConfirm(true)}
                    disabled={isAtInitialDefault}
                  >
                    Reset to Default
                  </button>
                  {/* ### Modified from HERE !! ### */}
                  {/* Save Button with Tooltip Wrapper */}
                  <div className="relative group">
                    <button
                      className={`px-4 py-1 text-white text-sm font-medium rounded transition-colors ${
                        isEdited ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-400 cursor-not-allowed" // Keep visual cue for disabled
                      }`}
                      onClick={handleSave}
                      disabled={!isEdited}
                    >
                      Save Changes
                    </button>
                    {/* Tooltip shown only when button is disabled */}
                    {!isEdited &&
                      !showSaveSuccess && ( // Also hide tooltip immediately after saving
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs px-2 py-1 bg-gray-700 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                          No changes to save
                        </span>
                      )}
                  </div>
                  {/* ### END OF MODIFICATION !!! ### */}
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default SettingsModal;
