"use client";

import React, { useState, useRef } from "react";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { X } from "lucide-react";
import { Category } from "@/hooks/useArticleFetching";
// Import the docx-preview library
import { renderAsync } from "docx-preview";

interface KnowledgeNoteGeneratorProps {
  categories: Category[];
  updateCategories: (categories: Category[]) => void;
  setActiveTab: (tab: string | null) => void;
  activeTab: string | null;
}

const KnowledgeNoteGenerator: React.FC<KnowledgeNoteGeneratorProps> = ({ setActiveTab, activeTab }) => {
  const [docBlob, setDocBlob] = useState<Blob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const generateDocxPreview = async () => {
    setIsGenerating(true);

    try {
      // Create document (same as your existing generateDocx function)
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              // Title text black with font "Calibri", and the size 12 and bold
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Knowledge Note for Tuesday, 4th March 2025 ",
                    bold: true,
                    size: 24,
                    color: "000000",
                    font: "Calibri",
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "",
                    bold: false,
                    size: 24,
                    color: "000000",
                    font: "Calibri",
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Hi everyone - below are news updates that the Knowledge team have put together over the past week. Events are highlighted in ",
                    bold: false,
                    size: 24,
                    color: "000000",
                    font: "Calibri",
                  }),
                  new TextRun({
                    text: "red",
                    bold: false,
                    size: 24,
                    color: "FF0000",
                    font: "Calibri",
                  }),
                  new TextRun({
                    text: ".",
                    bold: false,
                    size: 24,
                    color: "000000",
                    font: "Calibri",
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "We have used Copilot to produce a summary of the news (links to the news items can still be found below). Any feedback would be welcomed!",
                    color: "FF0000",
                  }),
                ],
              }),
            ],
          },
        ],
      });

      // Generate the document as a blob
      const buffer = await Packer.toBuffer(doc);
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      // Set the blob for download
      setDocBlob(blob);

      // Use docx-preview to render the document
      if (previewContainerRef.current) {
        // Clear the container first
        previewContainerRef.current.innerHTML = "";

        // Render the document using docx-preview
        await renderAsync(buffer, previewContainerRef.current, undefined, {
          className: "docx-preview",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          useBase64URL: true,
        });
      }
    } catch (error) {
      console.error("Error generating document:", error);
      if (previewContainerRef.current) {
        previewContainerRef.current.innerHTML =
          "<div style='color: #FF0000;'>Error generating preview. Please try again.</div>";
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadDocx = () => {
    if (docBlob) {
      saveAs(docBlob, "Knowledge_Note_" + new Date().toISOString().split("T")[0] + ".docx");
    }
  };

  return (
    <div className="my-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Knowledge Note Generator</h2>
        <div className="flex space-x-2">
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed hover:cursor-pointer"
            onClick={() => setActiveTab("generator")}
          >
            Generate
          </button>
          <button
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            onClick={() => setActiveTab("links")}
          >
            Links
          </button>
        </div>
      </div>

      {activeTab === "generator" && (
        <div className="px-6 pb-6 pt-3 bg-white rounded-lg shadow-sm">
          <div className="flex justify-end items-center mb-2">
            <button
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 hover:cursor-pointer"
              onClick={() => {
                setActiveTab(null);
              }}
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-800">Knowledge Note Preview</h3>
              <div className="flex space-x-2">
                <button
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  onClick={generateDocxPreview}
                  disabled={isGenerating}
                >
                  {isGenerating ? "Generating..." : "Preview Document"}
                </button>
                <button
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  onClick={downloadDocx}
                  disabled={!docBlob}
                >
                  Download DOCX
                </button>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 overflow-auto" style={{ height: "600px" }}>
              {/* Replace dangerouslySetInnerHTML with a ref-based approach */}
              <div ref={previewContainerRef} className="h-full" style={{ fontFamily: "Calibri, Arial, sans-serif" }}>
                <div className="h-full flex items-center justify-center text-gray-500">
                  Click &quot;Preview Document&quot; to generate a document preview
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeNoteGenerator;
