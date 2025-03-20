"use client";

import React, { useState } from "react";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, UnderlineType } from "docx";
import { X } from "lucide-react";

import { Article, Category, ArticleFetchProgressProps } from "@/utils/utils";

interface KnowledgeNoteGeneratorProps {
  categories: Category[];
  updateCategories: (categories: Category[]) => void;
}

const KnowledgeNoteGenerator: React.FC<KnowledgeNoteGeneratorProps> = ({ categories, updateCategories }) => {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateDocx = async () => {
    setIsGenerating(true);

    try {
      // Create document
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              // Title text black with font Aptos, and the size 12 and bold
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Knowledge Note for Tuesday, 4th March 2025 ",
                    bold: true,
                    size: 24,
                    color: "000000",
                    font: "Aptos",
                  }),
                  // New line
                  new TextRun({
                    text: "",
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
                    bold: false,
                    size: 24,
                    color: "000000",
                    font: "Aptos",
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
                    font: "Aptos",
                  }),
                  new TextRun({
                    text: "red",
                    bold: false,
                    size: 24,
                    // add red color
                    color: "FF0000",
                    font: "Aptos",
                  }),
                  new TextRun({
                    text: ".",
                    bold: false,
                    size: 24,
                    // add red color
                    color: "000000",
                    font: "Aptos",
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
                    font: "Aptos",
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Please let us know if you would like the note to cover any further topics. If you're unable to access ",
                    bold: false,
                    size: 24,
                    // add red color
                    color: "000000",
                    font: "Aptos",
                  }),
                  new TextRun({
                    text: "FT",
                    bold: true,
                    size: 24,
                    // add red color
                    color: "000000",
                    font: "Aptos",
                  }),
                  new TextRun({
                    text: " articles, please contact the Knowledge team.",
                    bold: false,
                    size: 24,
                    // add red color
                    color: "000000",
                    font: "Aptos",
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
                    font: "Aptos",
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
                    font: "Aptos",
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
                    font: "Aptos",
                  }),
                ],
              }),

              // Copilot summary note
              new Paragraph({
                children: [
                  new TextRun({
                    text: "We have used Copilot to produce a summary of the news (links to the news items can still be found below). Any feedback would be welcomed!\n\n",
                    color: "FF0000",
                  }),
                ],
              }),

              // News Summary
              new Paragraph({
                text: "News Summary (produced using Copilot)",
                bold: true,
              }),

              // Add summaries for each category
              ...categories.map(
                category =>
                  new Paragraph({
                    text: category.summary,
                    spacing: {
                      after: 200,
                    },
                  })
              ),

              // Top stories
              new Paragraph({
                text: "Top stories",
                heading: HeadingLevel.HEADING_2,
                bold: true,
                spacing: {
                  before: 400,
                  after: 200,
                },
              }),

              // Add top 5 categories' first articles
              ...categories.slice(0, 5).flatMap(category => {
                const firstArticle = category.articles[0];
                if (!firstArticle) return [];

                return new Paragraph({
                  children: [
                    new TextRun({
                      text: firstArticle.title,
                      underline: {
                        type: UnderlineType.SINGLE,
                      },
                      color: "0000FF",
                    }),
                  ],
                  spacing: {
                    after: 200,
                  },
                });
              }),

              // Individual categories with their articles
              ...categories.flatMap(category => [
                // Category name
                new Paragraph({
                  text: category.name,
                  heading: HeadingLevel.HEADING_2,
                  bold: true,
                  spacing: {
                    before: 400,
                    after: 200,
                  },
                }),

                // Articles for this category
                ...category.articles.map(
                  article =>
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: article.title,
                          underline: {
                            type: UnderlineType.SINGLE,
                          },
                          color: "0000FF",
                        }),
                      ],
                      spacing: {
                        after: 100,
                      },
                    })
                ),

                // Empty line between categories
                new Paragraph({
                  text: "",
                  spacing: {
                    after: 200,
                  },
                }),
              ]),
            ],
          },
        ],
      });

      // Generate and save the document
      const buffer = await Packer.toBuffer(doc);
      saveAs(new Blob([buffer]), "Knowledge_Note_" + new Date().toISOString().split("T")[0] + ".docx");
    } catch (error) {
      console.error("Error generating document:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="my-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Knowledge Note Generator</h2>
        <div className="flex space-x-2">
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed hover:cursor-pointer"
            onClick={() => setActiveTab("generate")}
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

      {activeTab === "generate" && (
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
              <button
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
                onClick={generateDocx}
                disabled={isGenerating}
              >
                {isGenerating ? "Generating..." : "Generate DOCX"}
              </button>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
              {/* Document Preview */}
              <div className="space-y-4">
                <h1 className="text-2xl font-bold">Knowledge Note for Tuesday, 4th March 2025</h1>

                <p>
                  Hi everyone - below are news updates that the Knowledge team have put together over the past week.
                  Events are highlighted in <span className="text-red-600">red</span>.
                </p>

                <p>
                  Please let us know if you would like the note to cover any further topics. If you're unable to access{" "}
                  <strong>FT</strong> articles, please contact the Knowledge team.
                </p>

                <p className="text-red-600">
                  We have used Copilot to produce a summary of the news (links to the news items can still be found
                  below). Any feedback would be welcomed!
                </p>

                <h2 className="text-xl font-bold">News Summary (produced using Copilot)</h2>

                {categories.map(category => (
                  <p key={category.id} className="my-2">
                    {category.summary}
                  </p>
                ))}

                <h2 className="text-xl font-bold mt-6">Top stories</h2>

                {categories.slice(0, 5).map(category => {
                  const firstArticle = category.articles[0];
                  if (!firstArticle) return null;

                  return (
                    <p key={`top-${category.id}`} className="my-1">
                      <a href={firstArticle.link} className="text-blue-500 underline">
                        {firstArticle.title}
                      </a>
                    </p>
                  );
                })}

                {categories.map(category => (
                  <div key={category.id} className="mt-6">
                    <h2 className="text-xl font-bold">{category.name}</h2>

                    {category.articles.map(article => (
                      <p key={article.id} className="my-1">
                        <a href={article.link} className="text-blue-500 underline">
                          {article.title}
                        </a>
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeNoteGenerator;
