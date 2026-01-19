import type { NextApiRequest, NextApiResponse } from "next";
import { executeQuery, connectDB } from "../../../utils/ds"; // Adjust path if needed

// Ensure the DB is connected when the API route is hit
connectDB();

// Define the expected structure of the successful response
// This should match the structure returned by GET /api/prompts/singleArticle
interface SummaryOfSummaryPromptsResponse {
  systemPrompt: string;
  userPrompt: string;
  maxWords: number;
  defaultSystemPrompt: string;
  defaultUserPrompt: string;
  defaultMaxWords: number;
}

// Define the structure of rows returned from the DB query, including new fields
interface PromptRow {
  prompt_role: "system" | "user";
  prompt_text: string;
  max_words?: number; // Nullable from DB
  default_system_prompt?: string; // Nullable
  default_user_prompt?: string; // Nullable
  default_max_words?: number; // Nullable
}

// Define error response structure
interface ErrorResponse {
  error: string;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SummaryOfSummaryPromptsResponse | ErrorResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const taskPurposeForQuery = "summary_of_summary"; // Specific purpose for this endpoint

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
      task_purpose = '${taskPurposeForQuery}'; -- Using variable for clarity
  `;

  try {
    const rows = (await executeQuery(query)) as PromptRow[] | null;

    let systemPrompt = "";
    let userPrompt = "";
    let maxWords: number | null = null;
    let defaultSystemPrompt = "";
    let defaultUserPrompt = "";
    let defaultMaxWords: number | null = null;

    // Application-level defaults for this specific purpose if DB values are missing
    const appDefaultMaxWords = 100; // Example default for summary_of_summary
    const appDefaultSystem = "Default system prompt for summarizing summaries.";
    const appDefaultUser = "Default user instruction for summarizing summaries.";

    if (!rows || rows.length === 0) {
      // No rows found, could mean they need to be inserted, or it's a valid "not found"
      // For now, let's assume it means we should use app-level defaults and inform client.
      // Alternatively, you could insert them here if this is the first-time setup.
      // For simplicity in GET, we'll return app defaults and a 200, but you might prefer 404
      // if DB entries are strictly required.
      console.warn(`No prompts found in DB for purpose: ${taskPurposeForQuery}. Using application defaults.`);
      return res.status(200).json({
        // Or 404 if you prefer strictness
        systemPrompt: appDefaultSystem,
        userPrompt: appDefaultUser,
        maxWords: appDefaultMaxWords,
        defaultSystemPrompt: appDefaultSystem, // The app defaults become the "original" defaults
        defaultUserPrompt: appDefaultUser,
        defaultMaxWords: appDefaultMaxWords,
      });
    }

    rows.forEach((row: PromptRow) => {
      if (row.prompt_role === "system") {
        systemPrompt = row.prompt_text;
        // Prioritize DB values, then fallback to app defaults for this purpose
        maxWords = row.max_words ?? appDefaultMaxWords;
        defaultSystemPrompt = row.default_system_prompt ?? appDefaultSystem;
        // If default_user_prompt is also on system row (common strategy)
        defaultUserPrompt = row.default_user_prompt ?? appDefaultUser;
        defaultMaxWords = row.default_max_words ?? appDefaultMaxWords;
      } else if (row.prompt_role === "user") {
        userPrompt = row.prompt_text;
        // If default_user_prompt is specifically stored on the user row, it takes precedence
        if (row.default_user_prompt) {
          defaultUserPrompt = row.default_user_prompt;
        }
      }
    });

    // Ensure critical values are set if they were somehow missed or if only one row was found
    systemPrompt = systemPrompt || defaultSystemPrompt || appDefaultSystem; // Use default if current is empty
    userPrompt = userPrompt || defaultUserPrompt || appDefaultUser; // Use default if current is empty
    maxWords = maxWords ?? appDefaultMaxWords;
    defaultSystemPrompt = defaultSystemPrompt || appDefaultSystem;
    defaultUserPrompt = defaultUserPrompt || appDefaultUser;
    defaultMaxWords = defaultMaxWords ?? appDefaultMaxWords;

    if (!systemPrompt && !userPrompt && rows.length > 0) {
      // This case means rows were found but no 'system' or 'user' role matched, which is an issue.
      console.error(
        `Database inconsistency: Found rows for '${taskPurposeForQuery}' but no 'system' or 'user' role prompt_text.`
      );
      return res.status(500).json({
        error: "Internal Server Error",
        message: `Incomplete prompt definitions in DB for ${taskPurposeForQuery}.`,
      });
    }

    const cleanSystemPrompt = systemPrompt.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const cleanUserPrompt = userPrompt.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const cleanDefaultSystemPrompt = defaultSystemPrompt.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const cleanDefaultUserPrompt = defaultUserPrompt.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    res.status(200).json({
      systemPrompt: cleanSystemPrompt,
      userPrompt: cleanUserPrompt,
      maxWords: maxWords,
      defaultSystemPrompt: cleanDefaultSystemPrompt,
      defaultUserPrompt: cleanDefaultUserPrompt,
      defaultMaxWords: defaultMaxWords,
    });
  } catch (error) {
    console.error(`Error fetching ${taskPurposeForQuery} prompts:`, error);
    if (error instanceof Error && error.message.includes("quota exceeded")) {
      return res.status(503).json({
        error: "Database Unavailable",
        message: "Azure SQL database quota has been exceeded for this month"
      });
    }
    res.status(500).json({
      error: "Internal Server Error",
      message: error instanceof Error ? error.message : "Unknown error fetching prompts",
    });
  }
}
