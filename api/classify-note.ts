import { generateText, output } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { z } from "zod";
import {
  classifyNoteRequestSchema,
  classifyNoteResponseSchema,
} from "../src/lib/contracts";

export const runtime = "edge";
const classifierModel = process.env.OAT_CLASSIFIER_MODEL ?? "google/gemini-2.5-flash-lite";

const classificationSchema = z.object({
  notebookId: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1),
  suggestedTitle: z.string().min(1).optional(),
});

export default async function handler(request: Request) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const requestBody = classifyNoteRequestSchema.parse(await request.json());
    const notebookList = requestBody.candidateNotebooks
      .map((notebook) => `- ${notebook.id}: ${notebook.name}`)
      .join("\n");

    const result = await generateText({
      model: gateway(classifierModel),
      temperature: 0,
      providerOptions: {
        gateway: {
          tags: ["feature:note-classification", "app:oat"],
        },
        google: {
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      },
      system: `You classify notes into existing notebooks.

Rules:
- Only choose notebook ids from the provided list.
- If no notebook is a clear fit, return notebookId as null.
- Confidence must be between 0 and 1.
- Suggested titles should be short, useful, and natural.
- Reasoning should be one sentence and refer to the chosen notebook or explain why Inbox is safer.`,
      prompt: `Note body:
${requestBody.body}

Candidate notebooks:
${notebookList}

Return a structured response that picks the single best notebook or null if the note should stay in Inbox (${requestBody.inboxNotebookId}).`,
      output: output.object({ schema: classificationSchema }),
    });

    const normalized = classifyNoteResponseSchema.parse(result.output);
    return Response.json(normalized);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to classify note.";
    return new Response(message, { status: 400 });
  }
}
