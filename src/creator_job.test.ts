import test from "node:test";
import assert from "node:assert/strict";
import { jobRequest, shouldNotifyCreator } from "./creator_job.ts";

test("a repeated failure for a subscribed audience is surfaced to the creator", () => {
  const input = jobRequest.parse({
    creatorId: "creator-7",
    assetId: "asset-3",
    subscriberCount: 4,
    contentStage: "subscriber-update",
    attempts: 1,
    lastError: "subscriber update was rejected"
  });
  assert.equal(shouldNotifyCreator(input), true);
});

test("a first failure with no subscribers stays out of the creator alert", () => {
  const input = jobRequest.parse({
    creatorId: "creator-7",
    assetId: "asset-3",
    subscriberCount: 0,
    contentStage: "processing",
    attempts: 1,
    lastError: "processing failed"
  });
  assert.equal(shouldNotifyCreator(input), false);
});
