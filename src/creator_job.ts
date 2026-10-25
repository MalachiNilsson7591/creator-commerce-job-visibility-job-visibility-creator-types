import { z } from "zod";
import { errors } from "./infrai_errors.ts";

export const jobRequest = z.object({
  creatorId: z.string().min(1),
  assetId: z.string().min(1),
  subscriberCount: z.number().int().nonnegative(),
  contentStage: z.enum(["delivery", "subscriber-update", "processing"]),
  attempts: z.number().int().positive(),
  lastError: z.string().min(1)
});

export type JobRequest = z.infer<typeof jobRequest>;

export function shouldNotifyCreator(input: JobRequest): boolean {
  return input.attempts >= 3 || input.subscriberCount > 0;
}

export async function surfaceFailure(raw: unknown): Promise<{ notifyCreator: boolean; captured: boolean }> {
  const input = jobRequest.parse(raw);
  const notifyCreator = shouldNotifyCreator(input);
  await errors.capture({
    type: "creator-commerce-job",
    message: input.lastError,
    creatorId: input.creatorId,
    assetId: input.assetId,
    subscriberCount: input.subscriberCount,
    contentStage: input.contentStage,
    attempts: input.attempts
  });
  return { notifyCreator, captured: true };
}

if (import.meta.main) {
  const input = {
    creatorId: process.env.CREATOR_ID ?? "demo-creator",
    assetId: process.env.ASSET_ID ?? "demo-asset",
    subscriberCount: Number(process.env.SUBSCRIBER_COUNT ?? "12"),
    contentStage: "processing",
    attempts: 3,
    lastError: "content processing could not produce the subscriber download"
  };
  const result = await surfaceFailure(input);
  console.log(JSON.stringify(result));
}
