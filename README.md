# Script to Video Studio

A React/Vite prototype for turning a script into editable scenes, with sample image previews and AI narration integration.

## Run locally

```bash
npm install
npm run dev
```

## Natural AI narration setup (ElevenLabs)

GitHub Pages is static and cannot run API code. The `/api/tts.js` function must run on a server such as Vercel. The ElevenLabs key stays in server-side environment variables and is never placed in the browser or this repository.

1. Create an ElevenLabs account. Choose a voice you are authorized to use, then copy its voice ID and create an API key. Check the current plan and pricing before generating: trial credits or free access may be limited, and continued use may require payment.
2. Import this repository into Vercel and deploy it. Vercel detects the `api/tts.js` serverless function. You can host the frontend on Vercel too, or continue using GitHub Pages.
3. Create an Upstash Redis database and copy its REST URL and token. Rate limiting is required; the function rejects requests if it is not configured.
4. In Vercel → Project → Settings → Environment Variables, set:
   - `ELEVENLABS_API_KEY` — secret key; never put it in GitHub or browser code.
   - `ELEVENLABS_VOICE_ID` — ID of the chosen voice.
   - `APP_ORIGIN` — exact frontend origin, e.g. `https://posho12.github.io` (no path or trailing slash).
   - `UPSTASH_REDIS_REST_URL` — Upstash REST URL.
   - `UPSTASH_REDIS_REST_TOKEN` — Upstash REST token; keep it secret.
   - Optional `TTS_DAILY_CHAR_LIMIT` — app-wide character ceiling per UTC day (default `50000`).
5. Redeploy after setting environment variables. Your endpoint URL will look like `https://YOUR-VERCEL-PROJECT.vercel.app/api/tts`.
6. Open the frontend, paste that URL into **Secure AI voice service URL**, then press **Generate AI voice** to create and listen to narration.

The endpoint caps requests at 10 per minute, limits each IP to 20,000 characters per UTC day, and enforces a shared daily character ceiling through Upstash. Provider account quotas and billing still apply; configure provider spending/usage controls where available. CORS only controls browser origins and is not user authentication, so do not treat it as protection against all abuse. This feature generates playable narration audio; it does not yet attach audio to an exported video, because video rendering/export is not implemented.

## Important

Never commit provider API keys, Upstash tokens, or other secrets to this public repository. GitHub Pages alone cannot run the API function; deploy the backend and configure its secret environment variables before AI narration will work.
