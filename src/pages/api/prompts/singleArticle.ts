// /api/prompts/singleArticle
import type { NextApiRequest, NextApiResponse } from "next";
import { executeQuery, connectDB } from "../../../utils/ds"; // Adjust path if needed

// Ensure the DB is connected when the API route is hit
connectDB();

// Define the expected structure of the successful response
interface SingleArticlePromptsResponse {
  systemPrompt: string;
  userPrompt: string;
  maxWords: number; // <-- ADDED
  defaultSystemPrompt: string; // <-- ADDED
  defaultUserPrompt: string; // <-- ADDED
  defaultMaxWords: number; // <-- ADDED
}

// Define the structure of rows returned from the DB query
interface PromptRow {
  prompt_role: "system" | "user";
  prompt_text: string;
  max_words?: number; // Nullable from DB
  default_system_prompt?: string; // Nullable
  default_user_prompt?: string; // Nullable
  default_max_words?: number; // Nullable
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
      prompt_text,
      max_words,
      default_system_prompt,
      default_user_prompt,
      default_max_words
    FROM
      PromptDefinitions
    WHERE
      task_purpose = 'article_summary';
  `;
  try {
    // --- 3. Execute the query ---
    const rows = (await executeQuery(query)) as PromptRow[] | null;

    let systemPrompt = "";
    let userPrompt = "";
    let maxWords: number | null = null; // Initialize as null
    let defaultSystemPrompt = "";
    let defaultUserPrompt = "";
    let defaultMaxWords: number | null = null;
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
        // Assume these are primarily stored/retrieved with the 'system' role row
        // or you have a strategy to pick the non-null value if stored on both.
        maxWords = row.max_words ?? 150; // Default if null
        defaultSystemPrompt = row.default_system_prompt ?? "Default system prompt from app"; // App default
        defaultUserPrompt = row.default_user_prompt ?? "Default user prompt from app"; // App default
        defaultMaxWords = row.default_max_words ?? 150; // App default
      } else if (row.prompt_role === "user") {
        userPrompt = row.prompt_text;
        // If default_user_prompt is stored specifically with the user row, retrieve here.
        // Otherwise, the one from the system row (or app default) will be used.
        if (row.default_user_prompt) defaultUserPrompt = row.default_user_prompt;
      }
    });

    // Ensure critical defaults are set if somehow missed
    maxWords = maxWords ?? 150;
    defaultSystemPrompt = defaultSystemPrompt || "App Default System";
    defaultUserPrompt = defaultUserPrompt || "App Default User";
    defaultMaxWords = defaultMaxWords ?? 150;

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
    const cleanDefaultSystemPrompt = defaultSystemPrompt.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const cleanDefaultUserPrompt = defaultUserPrompt.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // Return the cleaned prompts
    res.status(200).json({
      systemPrompt: cleanSystemPrompt,
      userPrompt: cleanUserPrompt,
      maxWords: maxWords, // Ensure it's a number
      defaultSystemPrompt: cleanDefaultSystemPrompt,
      defaultUserPrompt: cleanDefaultUserPrompt,
      defaultMaxWords: defaultMaxWords, // Ensure it's a number
    });
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
