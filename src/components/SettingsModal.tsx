import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ArticleSummaryPromptTab from "./ArticleSummaryPromptTab";

const SettingsModal = ({ setActiveTab }: { setActiveTab: (tab: string | null) => void }) => {
  const [activeSettingsTab, setActiveSettingsTab] = useState("article-summary");

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

          {/* Modal Content Area */}
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              {activeSettingsTab === "article-summary" && <ArticleSummaryPromptTab key="article-summary" />}

              {activeSettingsTab === "tab2" && (
                <motion.div
                  key="tab2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="p-6"
                >
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                    <h3 className="text-lg font-medium text-gray-700 mb-2">Tab 2 Content</h3>
                    <p className="text-gray-500">Additional settings will be available here.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default SettingsModal;
