// components/PromptEditorTab.tsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePrompts } from "@/hooks/usePrompts"; // Adjust path if needed
import { Save, RotateCcw, AlertCircle, CheckCircle, Edit, Clock, Info, X, Settings, HelpCircle } from "lucide-react";
import { PromptPurpose } from "@/utils/utils"; // Adjust path if needed

export default function PromptEditorTab({
  purpose,
  title,
  description,
  // These props from SettingsModal are now primarily FALLBACKS or initial display hints
  defaultSystemPrompt: propDefaultSystemPrompt,
  defaultUserPrompt: propDefaultUserPrompt,
  defaultMaxWords: propDefaultMaxWords = 150, // Default for the prop itself
  templateVariables = [],
}: {
  purpose: PromptPurpose;
  title: string;
  description: string;
  defaultSystemPrompt: string; // Prop from SettingsModal, used as fallback
  defaultUserPrompt: string; // Prop from SettingsModal, used as fallback
  defaultMaxWords?: number; // Prop from SettingsModal, used as fallback
  templateVariables?: Array<{ name: string; description: string }>;
}) {
  const {
    systemPrompt,
    userPrompt,
    maxWords,
    // Destructure the defaults fetched from API via the hook
    defaultSystemPromptFromApi,
    defaultUserPromptFromApi,
    defaultMaxWordsFromApi,
    setSystemPrompt,
    setUserPrompt,
    setMaxWords,
    isLoadingFetch,
    isUpdating,
    fetchError,
    updateError,
    isUpdateSuccess,
    savePrompts,
    resetUpdateStatus,
  } = usePrompts(purpose);

  const [isEditedLocally, setIsEditedLocally] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [showInfoTip, setShowInfoTip] = useState(true);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // Determine the effective defaults to compare against for 'isAtInitialDefault'
  // Prioritize defaults from API (via hook), then fall back to props
  const effectiveDefaultSystem = defaultSystemPromptFromApi ?? propDefaultSystemPrompt;
  const effectiveDefaultUser = defaultUserPromptFromApi ?? propDefaultUserPrompt;
  const effectiveDefaultMax = defaultMaxWordsFromApi ?? propDefaultMaxWords;

  const isAtInitialDefault =
    systemPrompt === effectiveDefaultSystem && userPrompt === effectiveDefaultUser && maxWords === effectiveDefaultMax;

  // Auto-hide info tip
  useEffect(() => {
    if (showInfoTip) {
      const timer = setTimeout(() => {
        setShowInfoTip(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showInfoTip]);

  // Effect to manage UI feedback after save/reset attempts
  useEffect(() => {
    if (isUpdateSuccess) {
      setIsEditedLocally(false); // Clear local edit flag on success
      setShowSaveSuccess(true);
      const timer = setTimeout(() => {
        setShowSaveSuccess(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isUpdateSuccess]);

  // Handle initiating SAVE action
  const handleSave = async () => {
    if (!isEditedLocally || isUpdating) return;
    resetUpdateStatus();
    setShowSaveSuccess(false);
    // savePrompts will use the hook's current systemPrompt, userPrompt, and maxWords
    await savePrompts();
  };

  // Handle initiating RESET action
  const handleReset = async () => {
    setShowResetConfirm(false);
    resetUpdateStatus();
    setShowSaveSuccess(false);

    // Reset to the defaults fetched from the API (via hook state),
    // or fall back to the prop-based defaults if API data isn't available.
    await savePrompts({
      systemPrompt: defaultSystemPromptFromApi ?? propDefaultSystemPrompt,
      userPrompt: defaultUserPromptFromApi ?? propDefaultUserPrompt,
      maxWords: defaultMaxWordsFromApi ?? propDefaultMaxWords,
    });
  };

  // Generic handler for text/number input changes
  const handleInputChange = (
    setter: React.Dispatch<React.SetStateAction<string | null>> | React.Dispatch<React.SetStateAction<number | null>>,
    value: string | number | null
  ) => {
    if (typeof value === "string") {
      (setter as React.Dispatch<React.SetStateAction<string | null>>)(value);
    } else {
      // Assumes number | null
      (setter as React.Dispatch<React.SetStateAction<number | null>>)(value);
    }
    setIsEditedLocally(true);
    setShowSaveSuccess(false);
    resetUpdateStatus();
  };

  // Specific handler for maxWords input to include parsing and validation
  const handleMaxWordsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const numValue = parseInt(rawValue, 10);
    let newValue: number | null;

    if (rawValue === "") {
      newValue = null; // Allow clearing the input
    } else if (!isNaN(numValue)) {
      newValue = Math.max(1, numValue); // Ensure at least 1
    } else {
      return; // Do not update if not a number
    }
    handleInputChange(setMaxWords, newValue);
  };

  if (isLoadingFetch) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading prompts...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 min-h-[300px]">
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

  // Main component JSX remains the same as you provided
  return (
    <div className="relative flex flex-col h-full bg-gray-50">
      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto px-6 pt-4 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${purpose}-content`}
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
                      <h3 className="text-blue-800 font-semibold mb-2">{title}</h3>
                      <p className="text-blue-700 text-sm leading-relaxed">{description}</p>
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
                  <label htmlFor={`systemPrompt-${purpose}`} className="block font-medium text-gray-800">
                    System Prompt <span className="text-gray-500 text-sm font-normal">(AI&apos;s Base Capability)</span>
                  </label>
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                    {systemPrompt?.length || 0} characters
                  </span>
                </div>
              </div>
              <div className="p-4">
                <textarea
                  id={`systemPrompt-${purpose}`}
                  rows={5}
                  className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
                  value={systemPrompt ?? ""}
                  onChange={e => handleInputChange(setSystemPrompt, e.target.value)}
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
                  <label htmlFor={`userPrompt-${purpose}`} className="block font-medium text-gray-800">
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
                  id={`userPrompt-${purpose}`}
                  rows={10}
                  className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
                  value={userPrompt ?? ""}
                  onChange={e => handleInputChange(setUserPrompt, e.target.value)}
                  placeholder="Provide specific instructions for the task..."
                />
                <p className="mt-2 text-xs text-gray-500 flex items-center">
                  <Info className="h-3 w-3 mr-1" />
                  Special variables like <code className="bg-gray-100 px-1 rounded text-blue-700">
                    ${`{title}`}
                  </code>{" "}
                  will be replaced with actual data.
                </p>
              </div>
            </div>

            {/* Advanced Settings Accordion */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <button
                className="w-full flex justify-between items-center bg-gray-50 px-4 py-3 border-b-gray-200 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                aria-expanded={showAdvancedSettings}
                style={{ borderBottomWidth: showAdvancedSettings ? 0 : "1px" }}
              >
                <span className="font-medium text-gray-800 flex items-center">
                  <Settings className="h-4 w-4 mr-2 text-gray-600" />
                  Advanced Settings
                </span>
                <span
                  className={`transform transition-transform duration-200 ${showAdvancedSettings ? "rotate-180" : ""}`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </button>

              <AnimatePresence>
                {showAdvancedSettings && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 space-y-4 border-t border-gray-200">
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-start">
                          <div className="flex-grow">
                            <label
                              htmlFor={`maxWords-${purpose}`}
                              className="block text-sm font-medium text-gray-700 mb-1"
                            >
                              Max Summary Words
                            </label>
                            <input
                              type="number"
                              id={`maxWords-${purpose}`}
                              className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
                              value={maxWords ?? ""}
                              onChange={handleMaxWordsChange}
                              min="1"
                              placeholder="e.g., 150"
                            />
                            <p className="mt-2 text-xs text-gray-500 flex items-center">
                              <Info className="h-3 w-3 mr-1 flex-shrink-0" />
                              Approximate maximum words for the generated summary.
                            </p>
                          </div>
                          <div className="ml-4 flex-shrink-0">
                            <div className="relative group">
                              <button
                                type="button"
                                className="text-gray-400 hover:text-blue-600 p-1 rounded-full hover:bg-blue-50 transition-colors"
                              >
                                <HelpCircle className="h-5 w-5" />
                              </button>
                              <div className="absolute right-0 bottom-full mb-2 w-64 bg-white p-3 rounded-lg shadow-lg border border-gray-200 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity z-10 text-left">
                                <h4 className="font-medium text-gray-800 mb-1">Word Limit Setting</h4>
                                <p className="text-xs text-gray-600">
                                  This controls how concise the AI&apos;s summaries will be. Lower values result in more
                                  condensed summaries.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Template Variables Helper (Your existing JSX for this) */}
            {templateVariables.length > 0 && (
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
                  {templateVariables.map((variable, index) => (
                    <div
                      key={index}
                      className="bg-white p-3 rounded-lg border border-gray-200 flex items-center"
                    >
                      <code className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-sm font-mono">
                        {/* Corrected template variable display */}
                        {`{{${variable.name}}}`}
                      </code>
                      <span className="ml-3 text-sm text-gray-600">{variable.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Sticky Footer (Your existing JSX for this) */}
      <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-md z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          {/* Left side: Status Indicators */}
          <div className="flex items-center min-h-[1.25rem]">
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
                  onClick={handleReset}
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
                      isEditedLocally && !isUpdating
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-blue-300 cursor-not-allowed"
                    }`}
                    onClick={handleSave}
                    disabled={!isEditedLocally || isUpdating}
                  >
                    {isUpdating ? <Clock className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    {isUpdating ? "Saving..." : "Save Changes"}
                  </button>
                  {!isEditedLocally && !isUpdating && !showSaveSuccess && (
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
