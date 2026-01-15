# Meet Assistant

Caption-aware question helper for Google Meet classes. Watches live captions, detects questions, and returns short answers through a secure backend service.

## Project summary
- Chrome Extension (MV3) + serverless backend
- Captions-only pipeline (no audio capture)
- Designed for low-friction classroom support and fast responses

## Highlights
- Caption parsing with dedupe + cooldowns to avoid spam
- Always-on overlay with large, readable text
- Install tokens and rate limiting to prevent abuse
- Privacy-first: no transcript storage

## Architecture
```
Google Meet captions
  -> Extension (content script + overlay)
  -> /install + /answer endpoints
  -> hosted language model service
  <- short answer
```

## Tech stack
- TypeScript
- Chrome Extension MV3
- Vercel Serverless Functions
- Fastify (optional)
- Upstash Redis (optional)

## Repo structure
- extension: content script + overlay UI
- backend: serverless API handlers
- shared: request/response types

## Deployment (Vercel)
- Set **Root Directory** to `backend`
- Add env vars for model API key + auth secret
- Optional: Upstash Redis for shared rate limiting

## Security & privacy
- Captions only (no audio capture)
- No secrets shipped in the extension
- Install token required for API access

## Status
- Phase 0–1 complete (constraints + scaffold)
- Next: caption reader, question detection, safety layer, and UI overlay

## Roadmap
- Caption reader + MutationObserver
- Question detection heuristics
- Safety filters and response shaping
- Streaming responses (optional)

## Demo
- Add a short screen recording once Phase 2 is complete
