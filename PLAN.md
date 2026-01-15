# 🧭 PROJECT PLAN — Google Meet Auto-Answer Assistant (Kid-Friendly)

---

## 🔹 PHASE 0 — Ground Rules & Constraints (DO FIRST)

### Goals

* No interaction required from the kid
* Extension always visible on Google Meet
* Reads **Google Meet captions (DOM)**, not audio
* Automatically detects questions and answers them
* Fast and safe

### Non-negotiable constraints

* ❌ No OpenAI API key in extension
* ❌ No silent audio capture
* ✅ Captions must be enabled
* ✅ Backend required

---

## 🔹 PHASE 1 — Architecture & Repo Setup
### ✅ Status: Completed

### Tech decisions (locked in)

* **Language:** TypeScript (extension + backend)
* **Extension:** Chrome Extension MV3
* **Backend:** Node.js + TypeScript (Fastify recommended)
* **AI:** OpenAI API (via backend only)
* **Transport:** HTTPS (WebSocket later if needed)

### Repo structure (monorepo)

```
/meet-ai-assistant
  /extension
    /src
      content.ts        # caption reader + question detection
      overlay.ts        # always-on UI
      utils.ts
    manifest.json
    tsconfig.json
  /backend
    /api
      answer.ts         # Vercel serverless API: POST /answer
      install.ts        # Vercel serverless API: POST /install
    /src
      server.ts         # Fastify app
      routes/answer.ts
      safety.ts
      rateLimit.ts
      prompt.ts
    tsconfig.json
  /shared
    types.ts            # shared request/response types
```

### Windsurf + Cascade AI tip

* Lock the folder structure first
* Let Cascade generate files **inside each phase only**
* Don’t jump phases

---

## 🔹 PHASE 2 — Chrome Extension Core (Captions Reader)
### ✅ Status: Completed & Tested

### Goals
* Read live captions from Google Meet DOM
* Handle caption appearance/disappearance gracefully
* Normalize text (remove timestamps, clean formatting)
* Rolling buffer to avoid re-processing old captions
* Emit clean caption events for Phase 3)
* Be resilient to Meet UI changes

### Implementation tasks

* Inject content script
* Detect caption container using:

  * known selectors
  * fallback DOM scanning
* Attach `MutationObserver`
* Normalize and deduplicate caption text
* Maintain a rolling transcript buffer (last N lines)

### Best practices

* Avoid hard-coded class names only
* Re-scan if captions disappear
* Ignore empty / repeated updates

---

## 🔹 PHASE 3 — Question Detection Logic
### ✅ Status: Completed

### Goal

Only send **real questions** to the backend (speed + cost + accuracy).

### Heuristics

* Ends with `?`
* Starts with: `what`, `why`, `how`, `when`, `where`, `who`, `which`
* Optional: “can you”, “do you”
* Minimum length threshold
* Cooldown (e.g. 5 seconds)

### Output

```ts
{
  question: string;
  context: string[]; // last 1–3 caption lines
}
```

### Windsurf tip

Let Cascade generate test cases for question detection logic.

---

## 🔹 PHASE 4 — Always-On Overlay UI (Kid-Friendly)
### ✅ Status: Completed

### Requirements

* Always visible
* No clicks required
* Large, readable text
* Clear states

### UI States

* 🟢 “Listening to captions…”
* ❓ “Question detected…”
* 💬 “Answer: …”
* ⚠️ “Not sure / blocked” (if safety filter triggers)

### Best practices

* Minimal animations
* Draggable but auto-positioned
* High contrast, large font

---

## 🔹 PHASE 5 — Backend API (Secure + Fast)
### ✅ Status: Completed

### Core endpoint

**POST /answer**

```ts
type AnswerRequest = {
  question: string;
  context?: string[];
};

type AnswerResponse = {
  answer: string;
  blocked?: boolean;
};
```

### Backend responsibilities

* Hold OpenAI API key (env var)
* Rate limit requests
* Authenticate extension installs (install token)
* Apply kid-safe rules
* Keep prompts short
* Return only text

### Vercel-ready endpoints (serverless)

For easiest deploy on Vercel, implement `/backend/api/answer.ts` and `/backend/api/install.ts` as serverless handlers that call shared logic in `/backend/src/*`.

### Authentication (install token)

Goal: Prevent other people from abusing your backend endpoint and burning your OpenAI credits.

Approach:

* Extension calls a one-time endpoint to obtain an install token (e.g. `POST /install`)
* Backend returns a signed token (JWT) or opaque token
* Extension includes the token in every `POST /answer` request
* Backend rate limits per token and per IP

### Framework

* **Fastify + TypeScript**
* `@fastify/rate-limit`

---

## 🔹 PHASE 6 — AI Prompting & Safety

### System prompt (example)

```
You are helping a child.
Answer in one short sentence.
Use simple words.
If unsafe or unclear, say "I'm not sure."
```

### Safety layer

* Block:

  * adult content
  * personal data
  * medical/legal advice
* Cap response length
* No memory storage

### Best practice

Safety logic lives **before** the OpenAI call.

---

## 🔹 PHASE 7 — Extension ↔ Backend Integration

### Transport

* Start with HTTPS `fetch()`
* Use keep-alive headers
* Upgrade to WebSocket later if needed

### Best practices

* Retry on failure (once)
* Timeout requests
* Graceful “No answer” fallback

---

## 🔹 PHASE 8 — Performance & Reliability

### Latency optimizations

* Captions instead of audio
* Short prompts
* Cooldown on answering
* Cache repeated questions during session

### Stability

* Detect caption restarts
* Reset observers if Meet layout changes
* Log only in dev mode

---

## 🔹 PHASE 9 — Parent Setup & Kid Experience

### One-time setup (adult)

* Install extension
* Allow Meet permissions
* Enable captions

### Kid experience

* No buttons
* No permissions prompts
* Just sees answers appear

---

## 🔹 PHASE 10 — Hardening & Future Enhancements

### Optional upgrades

* WebSocket streaming
* Text-to-speech answers
* Teacher mode toggle
* Offline fallback
* Analytics (opt-in only)

---

## 🔹 PHASE 11 — Deployment (MVP)

### ✅ Status: Completed

### Recommendation

Best MVP: Deploy the backend to **Vercel** (fastest path).

### Rate limiting storage (optional)

If you want reliable rate limiting across serverless instances, add **Upstash Redis** and use it as the shared store for rate limiting.

### Local dev (Docker Desktop)

Use Docker for backend-only local testing:

* `docker compose up --build`
* `docker compose logs -f`
* `docker compose down`

---

# ✅ FINAL RECOMMENDATION SUMMARY

✔ Chrome Extension + Backend
✔ All TypeScript
✔ Captions-based (no audio capture)
✔ No API keys in extension
✔ Always-on overlay
✔ Kid-safe, fast, compliant
✔ Backend deployed on Vercel (Upstash optional for shared rate limiting)


