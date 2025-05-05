import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePrompts } from "@/hooks/usePrompts";
import { Save, RotateCcw, AlertCircle, CheckCircle, Edit, Clock, Info, X } from "lucide-react";
import { PromptPurpose } from "@/utils/utils";
export default function PromptEditorTab({
  purpose,
  title,
  description,
  defaultSystemPrompt,
  defaultUserPrompt,
  templateVariables = [],
}: {
  purpose: PromptPurpose;
  title: string;
  description: string;
  defaultSystemPrompt: string;
  defaultUserPrompt: string;
  templateVariables?: Array<{ name: string; description: string }>;
}) {
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
  } = usePrompts(purpose);

  const [isEditedLocally, setIsEditedLocally] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [showInfoTip, setShowInfoTip] = useState(true);

  // Determine if current state matches defaults
  const isAtInitialDefault = systemPrompt === defaultSystemPrompt && userPrompt === defaultUserPrompt;

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

    // Call savePrompts, passing the default values DIRECTLY.
    await savePrompts({
      systemPrompt: defaultSystemPrompt,
      userPrompt: defaultUserPrompt,
    });
  };

  // Function called by textarea onChange
  const handleTextChange = ({ setter, value }: { setter: (value: string) => void; value: string }) => {
    setter(value); // Update the hook's state via its setter
    setIsEditedLocally(true); // Mark local edit
    setShowSaveSuccess(false);
    resetUpdateStatus();
  };

  if (isLoadingFetch) {
    return (
      <div className="flex items-center justify-center h-full">
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
                  onChange={e => handleTextChange({ setter: setSystemPrompt, value: e.target.value })}
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
                  onChange={e => handleTextChange({ setter: setUserPrompt, value: e.target.value })}
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

            {/* Template Variables Helper */}
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
                    <div key={index} className="bg-white p-3 rounded-lg border border-gray-200 flex items-center">
                      <code className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-sm font-mono">
                        ${`{${variable.name}}`}
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

      {/* Sticky Footer */}
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
