import type { NextApiRequest, NextApiResponse } from "next";

// Response types
interface SuccessResponse {
  categoryName: string;
  summary: string;
}

interface ErrorResponse {
  error: string;
}

// Request body interface
interface RequestBody {
  articles: Article[];
  maxWords?: number;
  categoryName?: string;
  customPrompt?: string;
}

interface Article {
  title: string;
  summary: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
): Promise<void> {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { 
    categoryName = "", 
    articles, 
    maxWords = 50,
    customPrompt = "Create a single, concise summary of these {categoryName} articles in exactly {maxWords} words. Focus on the most important points. Return ONLY the summary text without any formatting or prefixes."
  }: RequestBody = req.body;

  if (!articles || !Array.isArray(articles) || articles.length === 0) {
    return res.status(400).json({ error: "Articles array is required and must not be empty" });
  }

  try {
    // Step 1: Remove duplicate articles by comparing content similarity
    const uniqueArticles = removeDuplicates(articles);

    // Step 2: Prepare the prompt for summarization
    const endpoint = process.env.AZURE_OPENAI_API_BASE?.replace(/\/$/, "");
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

    if (!endpoint || !apiKey || !deploymentName) {
      return res.status(500).json({
        error: "Azure OpenAI API configuration is missing",
      });
    }

    // Format article content for the prompt
    const articlesText = uniqueArticles
      .map((article, index) => `Article ${index + 1}:\nTitle: ${article.title}\nSummary: ${article.summary}`)
      .join("\n\n");

    // Check if we have article text before proceeding
    if (!articlesText.trim()) {
      return res.status(400).json({ error: "Missing text parameter" });
    }

    // Process the custom prompt template by replacing variables
    const processedPrompt = customPrompt
      .replace("{categoryName}", categoryName)
      .replace("{maxWords}", maxWords.toString());

    // Call the Azure OpenAI API for summarization
    const aiResponse = await fetch(
      `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=2024-02-15-preview`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `${processedPrompt}

Articles:
${articlesText}`,
            },
          ],
          max_tokens: 300,
          temperature: 0.3,
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json();
      return res.status(aiResponse.status).json({
        error: `Azure OpenAI API error: ${errorData.error?.message || "Unknown error"}`,
      });
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices[0].message.content;

    // Return the response in the requested JSON format
    return res.status(200).json({
      categoryName: categoryName,
      summary: summary
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      error: `Error processing request: ${(error as Error).message}`,
    });
  }
}

// Function to remove duplicate articles based on content similarity
function removeDuplicates(articles: Article[]): Article[] {
  if (articles.length <= 1) return articles;

  const uniqueArticles: Article[] = [];
  const processedContents: string[] = [];

  for (const article of articles) {
    // Create a normalized version of the content for comparison
    const combinedContent = `${article.title.toLowerCase()} ${article.summary.toLowerCase()}`;

    // Check if this article is very similar to any we've already included
    let isDuplicate = false;

    for (const processedContent of processedContents) {
      // Calculate similarity between this article and previous ones
      const similarity = calculateSimilarity(combinedContent, processedContent);
      if (similarity > 0.7) {
        // 70% similarity threshold - adjust as needed
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      uniqueArticles.push(article);
      processedContents.push(combinedContent);
    }
  }

  return uniqueArticles;
}

// Simple Jaccard similarity calculation for text comparison
function calculateSimilarity(text1: string, text2: string): number {
  // Convert texts to sets of words (filtering out very short words)
  const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 3));

  // Find intersection and union
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  // Calculate Jaccard similarity
  return intersection.size / union.size;
}