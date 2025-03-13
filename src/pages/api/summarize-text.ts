import { NextApiRequest, NextApiResponse } from "next";

interface RequestBody {
  textContent: string;
  maxWords?: number;
  promptTemplate?: string;
  title?: string;
}

interface SuccessResponse {
  success: true;
  title: string;
  summary: string;
  originalContent: string;
  contentLength: number;
  jsonOutput: {
    title: string;
    summary: string;
  };
}

interface ErrorResponse {
  success: false;
  error: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
): Promise<void> {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { textContent, maxWords = 100, promptTemplate, title = "Untitled Content" }: RequestBody = req.body;

  if (!textContent) {
    return res.status(400).json({ success: false, error: "Text content is required" });
  }

  try {
    // Extract title from the first few lines if not provided
    let extractedTitle = title;
    if (title === "Untitled Content") {
      // Try to find a title in the first few lines
      const lines = textContent.split('\n').slice(0, 5);
      for (const line of lines) {
        const trimmedLine = line.trim();
        // Look for a line that could be a title (not too long, has some content)
        if (trimmedLine && trimmedLine.length > 3 && trimmedLine.length < 100) {
          extractedTitle = trimmedLine;
          break;
        }
      }
    }
    
    // Call Azure OpenAI API for summarization
    const endpoint = process.env.AZURE_OPENAI_API_BASE?.replace(/\/$/, "");
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

    if (!endpoint || !apiKey || !deploymentName) {
      return res.status(500).json({
        success: false,
        error: "Azure OpenAI API configuration is missing",
      });
    }

    // Use the prompt template if provided, otherwise use default
    let prompt = promptTemplate || 
      `Create a concise summary (maximum ${maxWords} words) of the following content. Focus only on the key information, main arguments, and essential details. The summary should be professional and focused without any introductory phrases like "This article discusses" or "Summary:".

Content title: ${extractedTitle}
Content: ${textContent}

Return your response as a JSON object with this exact format:
{
  "title": "The exact content title",
  "summary": "The concise summary of the content"
}`;

    // Replace any placeholders in the prompt template
    if (promptTemplate) {
      prompt = promptTemplate
        .replace("#words#", maxWords.toString())
        .replace("#title#", extractedTitle)
        .replace("#article_content#", textContent)
        .replace("#content#", textContent);
    }

    // Add explicit instructions to avoid markdown formatting
    prompt += "\n\nIMPORTANT: Provide the JSON response directly without any markdown formatting, code blocks, or backticks.";

    // Call Azure OpenAI API
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
              content: prompt,
            },
          ],
          max_tokens: 800,
          temperature: 0.3, // Lower temperature for more focused/consistent output
          response_format: { type: "json_object" }, // Request JSON format explicitly if supported
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json();
      return res.status(aiResponse.status).json({
        success: false,
        error: `Azure OpenAI API error: ${errorData.error?.message || "Unknown error"}`,
      });
    }

    const aiData = await aiResponse.json();
    let aiOutput = aiData.choices[0].message.content;

    // Clean up the response - remove markdown formatting if present
    aiOutput = aiOutput
      .replace(/^```json\s*/g, "") // Remove opening ```json
      .replace(/\s*```$/g, "")     // Remove closing ```
      .trim();

    // Parse the JSON response
    let jsonOutput;
    try {
      jsonOutput = JSON.parse(aiOutput);
      // Validate the JSON structure
      if (!jsonOutput.title || !jsonOutput.summary) {
        throw new Error("Invalid JSON structure");
      }
    } catch (error) {
      console.error("Failed to parse JSON from API response:", error);
      // If JSON parsing fails, create a valid JSON by simple extraction
      // This is a fallback solution
      const titleMatch = aiOutput.match(/"title"\s*:\s*"([^"]*)"/);
      const summaryMatch = aiOutput.match(/"summary"\s*:\s*"([^"]*)"/);
      
      jsonOutput = {
        title: titleMatch ? titleMatch[1] : extractedTitle,
        summary: summaryMatch ? summaryMatch[1] : aiOutput,
      };
    }

    // Return the result
    return res.status(200).json({
      success: true,
      title: extractedTitle,
      summary: jsonOutput.summary,
      originalContent: textContent,
      contentLength: textContent.length,
      jsonOutput: {
        title: jsonOutput.title,
        summary: jsonOutput.summary,
      },
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
}