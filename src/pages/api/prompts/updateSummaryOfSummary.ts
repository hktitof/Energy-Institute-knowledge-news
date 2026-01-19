import type { NextApiRequest, NextApiResponse } from "next";
import { executeQuery, connectDB } from "../../../utils/ds"; // Adjust path if needed

// Ensure the DB is connected when the API route is hit
connectDB();

// Define the structure of the successful PUT response
interface UpdateSuccessResponse {
  message: string;
}

// Define the structure for error responses
interface ErrorResponse {
  error: string;
  message?: string;
}

// Union type for all possible responses from this handler
type HandlerResponse = UpdateSuccessResponse | ErrorResponse;

export default async function handler(req: NextApiRequest, res: NextApiResponse<HandlerResponse>) {
  if (req.method !== "PUT") {
    res.setHeader("Allow", ["PUT"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const taskPurposeForQuery = "summary_of_summary"; // Specific purpose

  try {
    // Destructure all expected fields from the request body
    const { systemPrompt, userPrompt, maxWords } = req.body;

    // Input Validation
    if (
      typeof systemPrompt !== "string" ||
      typeof userPrompt !== "string" ||
      // maxWords is expected now, ensure it's a number if provided, or allow undefined to use default
      (maxWords !== undefined && typeof maxWords !== "number")
    ) {
      return res.status(400).json({
        error: "Bad Request",
        message:
          "Request body must include 'systemPrompt' and 'userPrompt' as strings. 'maxWords' must be a number if provided.",
      });
    }

    // Use a default for maxWords if not provided in the request, or use the provided value
    const finalMaxWords = typeof maxWords === "number" && !isNaN(maxWords) ? maxWords : 100; // Default for this purpose

    // IMPORTANT: Use Parameterized Queries if your executeQuery supports them!
    // The following uses string escaping for SQL Server as a fallback.
    const escapedSystemPrompt = systemPrompt.replace(/'/g, "''");
    const escapedUserPrompt = userPrompt.replace(/'/g, "''");

    // Construct UPDATE Queries
    // The default_... columns are NOT typically updated by a regular save of user edits.
    // They are meant to store the original pristine defaults.
    // A "reset" operation would copy from default_... to prompt_text/max_words.
    const updateSystemQuery = `
      MERGE INTO PromptDefinitions AS target
      USING (SELECT N'${escapedSystemPrompt}' AS prompt_text, ${finalMaxWords} AS max_words) AS source
      ON (target.task_purpose = '${taskPurposeForQuery}' AND target.prompt_role = 'system')
      WHEN MATCHED THEN
          UPDATE SET target.prompt_text = source.prompt_text, target.max_words = source.max_words, target.last_updated_at = GETDATE()
      WHEN NOT MATCHED THEN
          INSERT (task_purpose, prompt_role, prompt_text, max_words)
          VALUES ('${taskPurposeForQuery}', 'system', source.prompt_text, source.max_words);
    `;

    const updateUserQuery = `
      MERGE INTO PromptDefinitions AS target
      USING (SELECT N'${escapedUserPrompt}' AS prompt_text) AS source
      ON (target.task_purpose = '${taskPurposeForQuery}' AND target.prompt_role = 'user')
      WHEN MATCHED THEN
          UPDATE SET target.prompt_text = source.prompt_text, target.last_updated_at = GETDATE()
      WHEN NOT MATCHED THEN
          INSERT (task_purpose, prompt_role, prompt_text)
          VALUES ('${taskPurposeForQuery}', 'user', source.prompt_text);
    `;

    // Consider running these in a transaction if your executeQuery supports it
    await executeQuery(updateSystemQuery);
    await executeQuery(updateUserQuery);

    return res.status(200).json({ message: `Prompts for '${taskPurposeForQuery}' updated successfully.` });
  } catch (error) {
    console.error(`Error updating ${taskPurposeForQuery} prompts:`, error);
    if (error instanceof Error && error.message.includes("quota exceeded")) {
      return res.status(503).json({
        error: "Database Unavailable",
        message: "Azure SQL database quota has been exceeded for this month"
      });
    }
    return res.status(500).json({
      error: "Internal Server Error",
      message: error instanceof Error ? error.message : "Unknown error updating prompts",
    });
  }
}
