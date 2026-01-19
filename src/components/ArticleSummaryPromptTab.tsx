import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePrompts } from "@/hooks/usePrompts";
import { default_single_article_systemPrompt, default_single_article_userPromptInstructions } from "../utils/utils";
import {
  Save,
  RotateCcw,
  AlertCircle,
  CheckCircle,
  Edit,
  Clock,
  Info,
  X, // Import X icon
} from "lucide-react";

export default function ArticleSummaryPromptTab() {
  const {
    systemPrompt,
    userPrompt,
    setSystemPrompt, // Setter from the hook
    setUserPrompt, // Setter from the hook
    isLoadingFetch,
    isUpdating,
    fetchError,
    updateError,
    isUpdateSuccess,
    savePrompts, // Save function from the hook
    resetUpdateStatus,
  } = usePrompts("article_summary");

  const [isEditedLocally, setIsEditedLocally] = useState(false); // Renamed to avoid confusion
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [showInfoTip, setShowInfoTip] = useState(true);

  // Determine if current state matches defaults
  const isAtInitialDefault =
    systemPrompt === default_single_article_systemPrompt &&
    userPrompt === default_single_article_userPromptInstructions;

  // Auto-hide info tip
  useEffect(() => {
    if (showInfoTip) {
      const timer = setTimeout(() => {
        setShowInfoTip(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showInfoTip]);

  // ### Modified from here !!! ###

  // Effect to manage UI feedback after save/reset attempts
  useEffect(() => {
    if (isUpdateSuccess) {
      setIsEditedLocally(false); // Clear local edit flag on success
      setShowSaveSuccess(true);
      const timer = setTimeout(() => {
        setShowSaveSuccess(false);
        // No need to call resetUpdateStatus here, it's called before save/reset
      }, 2500);
      return () => clearTimeout(timer);
    }
    // Optionally handle updateError display persistence here if needed
  }, [isUpdateSuccess]);

  // Handle initiating SAVE action (Normal save)
  const handleSave = async () => {
    // Prevent saving if not locally edited or already updating
    if (!isEditedLocally || isUpdating) return;

    resetUpdateStatus();
    setShowSaveSuccess(false);
    // Call savePrompts WITHOUT arguments. It will use the hook's current internal state.
    await savePrompts();
    // Feedback handled by useEffect watching isUpdateSuccess
  };

  // Handle initiating RESET action
  const handleReset = async () => {
    setShowResetConfirm(false);
    resetUpdateStatus();
    setShowSaveSuccess(false);

    // OPTIONAL: Update UI optimistically (can remove if savePrompts updates state fast enough)
    // setSystemPrompt(default_single_article_systemPrompt);
    // setUserPrompt(default_single_article_userPromptInstructions);

    // Call savePrompts, passing the default values DIRECTLY.
    await savePrompts({
      systemPrompt: default_single_article_systemPrompt,
      userPrompt: default_single_article_userPromptInstructions,
    });

    // The hook's savePrompts function now handles updating the hook's internal state
    // upon successful save, so we don't strictly need the optimistic UI update above.
    // The useEffect watching isUpdateSuccess will handle isEditedLocally = false.
  };

  // Function called by textarea onChange
  const handleTextChange = ({ setter, value }: { setter: React.Dispatch<React.SetStateAction<string | null>>, value: string }) => {
    setter(value); // Update the hook's state via its setter
    setIsEditedLocally(true); // Mark local edit
    setShowSaveSuccess(false);
    resetUpdateStatus();
  };

  // This useEffect is now less critical as isEditedLocally handles the save button state
  // Keeping it doesn't hurt, it correctly reflects isAtInitialDefault state.
  useEffect(() => {
    // console.log("Hook state changed:", systemPrompt, userPrompt);
  }, [systemPrompt, userPrompt]);

  if (isLoadingFetch) {
    return (
      <div className="flex items-center justify-center h-full">
        {" "}
        {/* Ensure loading takes full height */}
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading prompts...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        {" "}
        {/* Ensure error takes full height */}
        <AlertCircle size={36} className="text-red-500 mb-2" />
        <p className="text-red-600 font-medium mb-4">Error loading prompts</p>
        <p className="text-gray-600 mb-6 text-center max-w-md">{fetchError}</p>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm"
          onClick={() => window.location.reload()} // Or trigger fetch again
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    // Ensure PARENT component provides height (e.g., h-screen, fixed height)
    <div className="relative flex flex-col h-full bg-gray-50">
      {/* Scrollable Content Area */}
      {/* Added pb-24 (adjust based on footer height) */}
      <div className="flex-1 overflow-y-auto px-6 pt-4 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key="article-summary-content" // Unique key for motion
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6 max-w-4xl mx-auto"
          >
            {/* Info Card */}
            <AnimatePresence>
              {showInfoTip && (
                <motion.div
                  initial={{ opacity: 1, height: "auto", marginBottom: "1.5rem" }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-100 shadow-sm"
                >
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
                    <button
                      onClick={() => setShowInfoTip(false)}
                      className="ml-3 text-blue-400 hover:text-blue-600 flex-shrink-0"
                      aria-label="Close information tip"
                    >
                      <X className="h-5 w-5" />
                    </button>
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
                  // ### Modified from here !!! ###
                  onChange={e => handleTextChange({ setter: setSystemPrompt, value: e.target.value })}
                  // ### End of change here ###
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
                  // ### Modified from here !!! ###
                  onChange={e => handleTextChange({ setter: setUserPrompt, value: e.target.value })}
                  // ### End of change here ###
                  placeholder="Provide specific instructions for the article summarization task..."
                />
                <p className="mt-2 text-xs text-gray-500 flex items-center">
                  <Info className="h-3 w-3 mr-1" />
                  Special variables like <code className="bg-gray-100 px-1 rounded text-blue-700">
                    ${`{title}`}
                  </code>{" "}
                  will be replaced with actual article data.
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
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </span>
                Available Template Variables
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
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
                  <span className="ml-3 text-sm text-gray-600">Max summary words</span>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Sticky Footer */}
      {/* Used sticky instead of absolute for simpler layout flow */}
      {/* ### Modified from here !!! ### */}
      <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-md z-10">
        {/* ### End of change here ### */}
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          {/* Left side: Status Indicators */}
          <div className="flex items-center min-h-[1.25rem]">
            {" "}
            {/* min-h prevents layout shifts */}
            <AnimatePresence mode="wait">
              {updateError && (
                <motion.span
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-sm text-red-600 flex items-center"
                >
                  <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />
                  {updateError}
                </motion.span>
              )}
              {/* Show unsaved only if locally edited, not saving, no error, and not showing success */}
              {/* ### Modified from here !!! ### */}
              {isEditedLocally && !isUpdating && !updateError && !showSaveSuccess && (
                <motion.span
                  key="unsaved"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-sm text-blue-600 flex items-center"
                >
                  <Edit className="h-4 w-4 mr-1 flex-shrink-0" />
                  Unsaved changes
                </motion.span>
              )}
              {showSaveSuccess && !updateError && (
                <motion.span
                  key="saved"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-sm text-green-600 flex items-center"
                >
                  <CheckCircle className="h-4 w-4 mr-1 flex-shrink-0" />
                  Saved successfully!
                </motion.span>
              )}
              {isUpdating && (
                <motion.span
                  key="saving"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-sm text-blue-600 flex items-center"
                >
                  <Clock className="h-4 w-4 mr-1 animate-spin flex-shrink-0" />
                  Saving...
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Right side: Action Buttons */}
          <div className="flex space-x-3">
            {showResetConfirm ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.1 }}
                className="flex items-center space-x-3"
              >
                <span className="text-sm text-red-600 flex items-center font-medium shrink-0">
                  <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />
                  Confirm reset?
                </span>
                <button
                  className="px-4 py-2 border border-red-300 text-red-600 text-sm font-medium rounded-md hover:bg-red-50 transition-colors shadow-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleReset} // Calls the corrected handleReset
                  disabled={isUpdating}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Yes, reset
                </button>
                <button
                  className="px-4 py-2 border border-gray-300 text-gray-600 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
                  onClick={() => setShowResetConfirm(false)}
                  disabled={isUpdating}
                >
                  Cancel
                </button>
              </motion.div>
            ) : (
              <>
                {/* Reset Button */}
                <button
                  className={`px-4 py-2 border border-gray-300 text-gray-600 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors shadow-sm flex items-center ${
                    // Disable reset if already at default OR currently saving/resetting
                    isAtInitialDefault || isUpdating ? "opacity-50 cursor-not-allowed" : ""
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
                      // Enable save ONLY if locally edited AND not currently saving/resetting
                      // ### Modified from here !!! ###
                      isEditedLocally && !isUpdating
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-blue-300 cursor-not-allowed"
                      // ### End of change here ###
                    }`}
                    onClick={handleSave} // Calls the corrected handleSave
                    // ### Modified from here !!! ###
                    disabled={!isEditedLocally || isUpdating} // Correctly uses isEditedLocally
                    // ### End of change here ###
                  >
                    {isUpdating ? <Clock className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    {isUpdating ? "Saving..." : "Save Changes"}
                  </button>
                  {/* Tooltip: Show if save is disabled *because* there are no edits */}
                  {/* ### Modified from here !!! ### */}
                  {!isEditedLocally && !isUpdating && !showSaveSuccess && (
                    // ### End of change here ###
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 pointer-events-none whitespace-nowrap z-20">
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
