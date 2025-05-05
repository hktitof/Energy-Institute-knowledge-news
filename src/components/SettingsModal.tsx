import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PromptEditorTab from "./PromptEditorTab";
import {
  default_single_article_systemPrompt,
  default_single_article_userPromptInstructions,
  default_summary_of_summary_systemPrompt,
  default_summary_of_summary_userPromptInstructions,
  summaryOfSummariesTemplateVariables,
  singleArticleTemplateVariables,
} from "../utils/utils";

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
                Single Article Summary
              </button>
              <button
                className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
                  activeSettingsTab === "summary-of-summaries"
                    ? "bg-blue-50 text-blue-600 border-b-2 border-blue-500"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveSettingsTab("summary-of-summaries")}
              >
                Summary of Summaries
              </button>
            </div>
          </div>

          {/* Modal Content Area */}
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              {activeSettingsTab === "article-summary" && (
                <PromptEditorTab
                  key="article-summary"
                  purpose="article_summary"
                  title="AI Article Summarization Configuration"
                  description="These prompts control how the AI interprets and summarizes articles. Customize both the system prompt (AI's capabilities) and user instructions (specific summarization guidance) to achieve your desired summary style and format."
                  defaultSystemPrompt={default_single_article_systemPrompt}
                  defaultUserPrompt={default_single_article_userPromptInstructions}
                  templateVariables={singleArticleTemplateVariables}
                />
              )}

              {activeSettingsTab === "summary-of-summaries" && (
                <PromptEditorTab
                  key="summary-of-summaries"
                  purpose="summary_of_summary"
                  title="AI Summary Synthesis Configuration"
                  description="These prompts control how the AI synthesizes multiple article summaries into a cohesive overview. Customize both the system prompt (AI's capabilities) and user instructions (specific synthesis guidance) to achieve your desired meta-summary style and format."
                  defaultSystemPrompt={default_summary_of_summary_systemPrompt}
                  defaultUserPrompt={default_summary_of_summary_userPromptInstructions}
                  templateVariables={summaryOfSummariesTemplateVariables}
                />
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default SettingsModal;
