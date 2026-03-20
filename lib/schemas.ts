import { z } from "zod";

export const searchQuerySchema = z.object({
  q: z.string().trim().default(""),
});

export const reviewSubmissionSchema = z.object({
  substanceId: z.string().min(3),
  submittedBy: z.string().min(2),
  claim: z.string().min(10),
  rationale: z.string().min(10),
  sourceIds: z.array(z.string().min(3)).min(1),
});

export const audienceSchema = z.enum(["public", "clinical"]).default("public");
