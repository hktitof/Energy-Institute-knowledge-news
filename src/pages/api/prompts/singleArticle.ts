// /api/prompts/singleArticle
import type { NextApiRequest, NextApiResponse } from "next";
import { executeQuery, connectDB } from "../../../utils/ds"; // Adjust path if needed

// Ensure the DB is connected when the API route is hit
connectDB();

// Define the expected structure of the successful response
interface SingleArticlePromptsResponse {
  systemPrompt: string;
  userPrompt: string;
}

// Define the structure of rows returned from the DB query
interface PromptRow {
  prompt_role: "system" | "user";
  prompt_text: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SingleArticlePromptsResponse | { error: string; message?: string }> // Define possible response types
) {
  // --- 1. Allow only GET requests ---
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]); // Inform client which methods are allowed
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // --- 2. Define the SQL Query (Hardcoded purpose) ---
  const query = `
    SELECT
      prompt_role,
      prompt_text
    FROM
      PromptDefinitions
    WHERE
      task_purpose = 'article_summary'; -- Fixed purpose for this endpoint
  `;

  try {
    // --- 3. Execute the query ---
    const rows = (await executeQuery(query)) as PromptRow[] | null; // Cast result

    let systemPrompt = "" as string;
    let userPrompt = "" as string;

    // --- 4. Check if rows were returned ---
    if (!rows || rows.length === 0) {
      // This means the prompts haven't been inserted into the DB yet for 'article_summary'
      return res.status(404).json({
        error: "Not Found",
        message: "Article summary prompts not found in the database. Please ensure they are inserted correctly.",
      });
    }

    // --- 5. Process the results ---
    rows.forEach((row: PromptRow) => {
      if (row.prompt_role === "system") {
        systemPrompt = row.prompt_text;
      } else if (row.prompt_role === "user") {
        userPrompt = row.prompt_text;
      }
    });

    // --- 6. Validate that both prompts were found ---
    // If the query returned rows but we didn't find both roles, it indicates a data integrity issue.
    if (systemPrompt === null || userPrompt === null) {
      console.error("Database inconsistency: Found rows for 'article_summary' but missing 'system' or 'user' role.");
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Incomplete prompt definitions found in the database for article summaries.",
      });
    }

    // --- 7. Normalize Newlines and Return ---
    // Replace Windows newlines (\r\n) and old Mac newlines (\r) with standard Unix newlines (\n)
    const cleanSystemPrompt = systemPrompt.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const cleanUserPrompt = userPrompt.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // Return the cleaned prompts
    res.status(200).json({ systemPrompt: cleanSystemPrompt, userPrompt: cleanUserPrompt });
  } catch (error) {
    // --- 8. Handle potential database errors ---
    console.error("Error fetching article summary prompts:", error);

    // Reuse your existing error handling logic for specific errors
    if (error instanceof Error && error.message.includes("quota exceeded")) {
      return res.status(503).json({
        error: "Database Unavailable",
        message: "Azure SQL database quota has been exceeded for this month",
      });
    }

    // Generic internal server error for other DB issues
    res.status(500).json({
      error: "Internal Server Error",
      message: error instanceof Error ? error.message : "Unknown error fetching prompts",
    });
  }
}
