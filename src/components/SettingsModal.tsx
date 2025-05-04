import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const var_systemPrompt =
  "You are an expert at analyzing web content and creating summaries of articles, blog posts, and informative content. You can identify whether content is an article worthy of summarization or not. You're designed to be inclusive and summarize a wide range of content formats, including technical descriptions, project overviews, and news articles, even if they have unconventional structures";

const var_userPromptInstructions =  `I need you to analyze the following web content and determine if it's a summarizable article, news post, project description, or other informative content.

Title extracted from the page: ${'{title}'}

Content extracted from the page:
---
${'{textContent}'}
---

First, determine if this is SUMMARIZABLE CONTENT. Content is summarizable if it:
1. Contains informative, factual, or news-related information
2. Has a coherent narrative or structure
3. Provides details about events, projects, research, products, etc.
4. Is NOT primarily navigation menus, sparse listings, or computer-generated code

Even if the content has an unconventional structure or is presented as a project overview, product description, or technical information, it can still be summarizable if it communicates meaningful information.

If the content IS summarizable, create a concise summary (maximum ${'{maxWords}'} words) capturing the key information.

If the content is NOT summarizable (meaning it's just navigation elements, random text snippets without context, or computer code), indicate this in your response.

Return your analysis as a JSON object with this format:
{
  "is_summarizable": true/false,
  "title": "The original title or improved version if needed",
  "summary": "Your concise summary of the content"
}

For non-summarizable content, use:
{
  "is_summarizable": false,
  "title": "NOT AN ARTICLE",
  "summary": "Content does not appear to be a summarizable article."
}

IMPORTANT: Be inclusive in what you consider summarizable. Technical descriptions, project information, research findings, and product details ARE summarizable even if they don't follow traditional article formats.`;

const SettingsModal = ({
  setActiveTab,
  defaultSystemPrompt = var_systemPrompt,
  defaultUserPromptInstructions = var_userPromptInstructions,
  onSavePrompts,
}: {
  setActiveTab: (tab: string | null) => void;
  defaultSystemPrompt?: string;
  defaultUserPromptInstructions?: string;
  onSavePrompts: (prompts: { systemPrompt: string; userPromptInstructions: string }) => void;
}) => {
  // State for prompt management
  const [activeSettingsTab, setActiveSettingsTab] = useState("article-summary");
  const [systemPrompt, setSystemPrompt] = useState(defaultSystemPrompt || var_systemPrompt);
  const [userPromptInstructions, setUserPromptInstructions] = useState(
    defaultUserPromptInstructions || var_userPromptInstructions
  );
  const [isEdited, setIsEdited] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Update state when props change
  useEffect(() => {
    if (defaultSystemPrompt) setSystemPrompt(defaultSystemPrompt);
    if (defaultUserPromptInstructions) setUserPromptInstructions(defaultUserPromptInstructions);
  }, [defaultSystemPrompt, defaultUserPromptInstructions]);

  // Handle save
  const handleSave = () => {
    onSavePrompts({
      systemPrompt,
      userPromptInstructions,
    });
    setIsEdited(false);
  };

  // Handle reset to defaults
  const handleReset = () => {
    setSystemPrompt(defaultSystemPrompt || "");
    setUserPromptInstructions(defaultUserPromptInstructions || "");
    setIsEdited(false);
    setShowResetConfirm(false);
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

          {/* Modal Content Area with scrollable content */}
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
                    <div className="flex justify-between items-center mb-2">
                      <label htmlFor="systemPrompt" className="block text-sm font-medium text-gray-700">
                        System Prompt <span className="text-gray-500">(AI&apos;s Base Capability)</span>
                      </label>
                      <span className="text-xs text-gray-500">{systemPrompt.length} characters</span>
                    </div>
                    <textarea
                      id="systemPrompt"
                      rows={5}
                      className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
                      value={systemPrompt}
                      onChange={e => {
                        setSystemPrompt(e.target.value);
                        setIsEdited(true);
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
                      <label htmlFor="userPromptInstructions" className="block text-sm font-medium text-gray-700">
                        User Instructions <span className="text-gray-500">(Task-Specific Guidelines)</span>
                      </label>
                      <span className="text-xs text-gray-500">{userPromptInstructions.length} characters</span>
                    </div>
                    <textarea
                      id="userPromptInstructions"
                      rows={12}
                      className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
                      value={userPromptInstructions}
                      onChange={e => {
                        setUserPromptInstructions(e.target.value);
                        setIsEdited(true);
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
                </motion.div>
              )}

              {activeSettingsTab === "tab2" && (
                <motion.div
                  key="tab2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                    <h3 className="text-lg font-medium text-gray-700 mb-2">Tab 2 Content</h3>
                    <p className="text-gray-500">Additional settings will be available here.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Modal Footer with Action Buttons */}
          <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-between items-center">
            <div>
              {isEdited && (
                <span className="text-sm text-blue-600 flex items-center">
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
                </span>
              )}
            </div>
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
                  <button
                    className="px-3 py-1 border border-gray-300 text-gray-600 text-sm font-medium rounded hover:bg-gray-50 transition-colors"
                    onClick={() => setShowResetConfirm(true)}
                    disabled={!isEdited}
                  >
                    Reset to Default
                  </button>
                  <button
                    className={`px-4 py-1 text-white text-sm font-medium rounded transition-colors ${
                      isEdited ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-400 cursor-not-allowed"
                    }`}
                    onClick={handleSave}
                    disabled={!isEdited}
                  >
                    Save Changes
                  </button>
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
