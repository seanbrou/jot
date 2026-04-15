import { z } from "zod";

export const candidateNotebookSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

export const classifyNoteRequestSchema = z.object({
  noteId: z.string().min(1),
  body: z.string().min(1),
  candidateNotebooks: z.array(candidateNotebookSchema),
  inboxNotebookId: z.string().min(1),
});

export const classifyNoteResponseSchema = z.object({
  notebookId: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1),
  suggestedTitle: z.string().min(1).optional(),
});

export type ClassifyNoteRequest = z.infer<typeof classifyNoteRequestSchema>;
export type ClassifyNoteResponse = z.infer<typeof classifyNoteResponseSchema>;
