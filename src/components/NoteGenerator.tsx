"use client";

import React, { useState, useRef } from "react";
import { saveAs } from "file-saver";
import { Document, ExternalHyperlink, Packer, Paragraph, TextRun } from "docx";
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

const KnowledgeNoteGenerator: React.FC<KnowledgeNoteGeneratorProps> = ({ categories, setActiveTab, activeTab }) => {
  const [docBlob, setDocBlob] = useState<Blob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const dynamicParagraphs = categories.map(
    item =>
      new Paragraph({
        bullet: { level: 0 },
        children: [
          new TextRun({
            text: `${item.name}: `,
            bold: true,
            size: 20,
            color: "000000",
            font: "Calibri",
          }),
          new TextRun({
            text: item.summary,
            size: 20,
            color: "000000",
            font: "Calibri",
          }),
        ],
      })
  );

  const categoryParagraphs = categories.flatMap((cat, idx) => {
    // Create the category title
    const categoryTitle = new Paragraph({
      children: [
        new TextRun({
          text: cat.name,
          bold: true,
          font: "Calibri",
          size: 20,
          color: "000000",
        }),
      ],
    });

    // Filter to only include selected articles
    const selectedArticles = cat.articles.filter(article => article.selected);

    // Skip categories with no selected articles
    if (selectedArticles.length === 0) {
      return [];
    }

    // Create paragraphs for each selected article
    const articles = selectedArticles.map(
      article =>
        new Paragraph({
          children: [
            new ExternalHyperlink({
              link: article.link,
              children: [
                new TextRun({
                  text: article.title,
                  underline: {},
                  color: "#547e8c",
                  font: "Calibri",
                  size: 20,
                }),
              ],
            }),
          ],
        })
    );

    // Combine them
    const paragraphs = [categoryTitle, ...articles];

    // If this isn't the last category, add an empty paragraph after the articles
    if (idx < categories.length - 1) {
      paragraphs.push(new Paragraph({}));
    }

    return paragraphs;
  });

  // get today date like this "Tuesday, 4th March 2025"
  function getFormattedDate(): string {
    const date = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
    const formattedDate = new Intl.DateTimeFormat("en-GB", options).format(date);

    return formattedDate.replace(/\b(\d{1,2})(?=(st|nd|rd|th))?\b/g, day => {
      const suffix = getDaySuffix(parseInt(day));
      return `${day}${suffix}`;
    });
  }

  function getDaySuffix(day: number): string {
    if (day >= 11 && day <= 13) return "th";
    switch (day % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  }

  const generateDocxPreview = async () => {
    setIsGenerating(true);

    try {
      // Create document (same as your existing generateDocx function)
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Knowledge Note for " + getFormattedDate(),
                    bold: true,
                    size: 24,
                    color: "000000",
                    font: "Aptos",
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "",
                    // bold: true,
                    size: 20,
                    color: "000000",
                    font: "Aptos",
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Hi all - below are news updates that the Knowledge team have put together over the past week. Events are highlighted in red.",
                    // bold: true,
                    size: 20,
                    color: "000000",
                    font: "Aptos",
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "",
                    // bold: true,
                    size: 20,
                    color: "000000",
                    font: "Aptos",
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Please let us know if you would like the note to cover any further topics. If you're unable to access",
                    // bold: true,
                    size: 20,
                    color: "000000",
                    font: "Aptos",
                  }),
                  new TextRun({
                    text: " FT ",
                    bold: true,
                    size: 20,
                    color: "000000",
                    font: "Aptos",
                  }),
                  new TextRun({
                    text: "articles, please contact the Knowledge team.",
                    // bold: true,
                    size: 20,
                    color: "000000",
                    font: "Aptos",
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "",
                    // bold: true,
                    size: 20,
                    color: "000000",
                    font: "Aptos",
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "We have used our new tool powered by Gpt-4o to produce a summary of the news (links to the news items can still be found below). Any feedback would be welcomed! ",
                    // bold: true,
                    size: 20,
                    color: "000000",
                    font: "Aptos",
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "",
                    // bold: true,
                    size: 20,
                    color: "000000",
                    font: "Aptos",
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "News Summary (produced using our new tool powered by Gpt-4o) ",
                    bold: true,
                    size: 20,
                    color: "000000",
                    font: "Aptos",
                  }),
                ],
              }),
              // ... other paragraphs ...
              // Insert bullet list items
              ...dynamicParagraphs,
              new Paragraph({
                children: [
                  new TextRun({
                    text: "",
                    // bold: true,
                    size: 20,
                    color: "000000",
                    font: "Aptos",
                  }),
                ],
              }),
              ...categoryParagraphs,
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
      {activeTab === "generator" && (
        <div className="px-6 pb-6 pt-3 bg-white rounded-lg shadow-sm">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Knowledge Note Generator</h2>
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
