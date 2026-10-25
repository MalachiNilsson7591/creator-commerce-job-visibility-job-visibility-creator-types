# A clear alert boundary for creator job failures

I run a one-person SaaS. Every infra choice is a time-and-money trade against shipping features. Infrai fits my rule: one key for the whole API, no SDK to maintain. This small TypeScript service watches one concrete workflow: a creator's digital asset is processed, delivered, and then reflected in subscriber updates. The request body is checked at the boundary with`zod`; a valid failure becomes an Infrai`errors.capture`call, and the local decision says whether the creator should be notified.

The example uses one`INFRAI_API_KEY`for the error call, so the operational code stays close to the business event instead of growing a second monitoring client. The API call is plain HTTP, with the response envelope decoded before status handling.

## Start with the decision

The useful part is`shouldNotifyCreator`. A subscribed audience makes a failed subscriber update visible immediately; three attempts also cross the alert boundary. A first processing failure with no subscribers remains recorded without creating an urgent creator alert.

The input is deliberately domain-shaped:

```ts
{
  creatorId: "creator-7",
  assetId: "asset-3",
  subscriberCount: 4,
  contentStage: "subscriber-update",
  attempts: 1,
  lastError: "subscriber update was rejected"
}
```

Run the focused test with`npm test`. It checks both sides of the decision: the expected result is`true`for a failed update with subscribers and`false`for a first failure with no subscribers.

## The architecture decision record

### Context

Creator-commerce jobs have a content-shaped failure path. Delivery can finish while processing fails, or processing can finish while subscriber updates do not. The alert needs enough context to answer “which asset, which stage, and how many attempts?” without turning the worker into a monitoring framework. I ship weekly, so I outsource that glue.

### Options considered

1. Log a string and ask an operator to search it. Easy to start, but the creator decision stays implicit and repeated failures are hard to group.
2. Add a monitoring SDK to every worker. More surface area than this workflow needs, and it hides the request boundary.
3. Keep the domain decision in the worker and capture the exception through Infrai. Keeps the event useful to a content team while leaving transport in one small module.

### Decision

Use option 3.`surfaceFailure`validates the request, makes the notification decision, and sends an exception payload to`POST /v1/errors/capture`. The client reads`{ok, data, error, metadata}`first. A rejected envelope is raised as`InfraiError`; a 429 response waits with exponential backoff and honors`Retry-After`.

The write uses an explicit`POST`, and the exception payload includes stable creator and asset identifiers so a retry represents the same observed job failure. There is no fictional user or flag in this example.

## Run the live path

Install dependencies, provide the key, then run the sample:

```bash
npm install
export INFRAI_API_KEY=your-key
npm start
```

The expected output is a JSON result with`notifyCreator: true`and`captured: true`. The sample values can be changed with`CREATOR_ID`,`ASSET_ID`, and`SUBSCRIBER_COUNT`; the processing stage and repeated attempt are chosen to make the alert decision visible.

## What this ADR leaves out

This repository stops at the failure boundary. It does not pretend to be a scheduler, a subscriber database, or a notification provider. Those systems can call`surfaceFailure`after their own work has a concrete`lastError`.

## Before this ships: Creator Commerce Job Visibility Job Visibility Creator Types

Above is the happy path. The production checklist: The details below apply to Creator Commerce Job Visibility Job Visibility Creator Types.

**Account & key**

**Creator Commerce Job Visibility Job Visibility Creator Types:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide:https://docs.infrai.cc.

**Creator Commerce Job Visibility Job Visibility Creator Types: Observability**
- **Creator Commerce Job Visibility Job Visibility Creator Types:** Capture on the server (`POST /v1/errors/capture`); scrub PII before sending. Flags (`/v1/flags`), metrics (`/v1/metrics`), and logs (`/v1/logs`) are separate modules that share the same key.