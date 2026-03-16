# मोदी चैटबॉट — Modi Chatbot

A tone-aware chatbot that responds in Hindi as Narendra Modi with dynamic color-coded messages, built with Next.js and powered by Groq (LLaMA 3.3 70B).

## Features

- **Deadline detection** — type a task + deadline and the response bubble turns Blue (≥24h) → Yellow (12h) → Deep Orange (<2h)
- **Number detection** — type a number and the bubble turns White → Grey → Black based on the last 2 digits (00=white, 50=grey, 100=black)
- **Tone detection** — all other messages are analyzed for sentiment and colored Red (very sad) → White (neutral) → Green (very happy)
- All responses in **Hindi (Devanagari script)** as Narendra Modi, with English translation
- **WCAG 2.0 compliant** — auto-computed text contrast, keyboard accessible, ARIA labels

## Tech Stack

- [Next.js 16](https://nextjs.org/) (App Router, TypeScript)
- [Groq SDK](https://groq.com/) — LLaMA 3.3 70B Versatile
- [Tailwind CSS v4](https://tailwindcss.com/)

## Getting Started

1. Clone the repo
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file:
   ```
   GROQ_API_KEY=your_groq_api_key_here
   ```
   Get a free key at [console.groq.com/keys](https://console.groq.com/keys)

4. Run the dev server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
app/
  page.tsx              # Chat UI
  layout.tsx            # Root layout
  globals.css           # Global styles
  api/
    chat/
      route.ts          # Groq API route
lib/
  colors.ts             # Color interpolation + WCAG helpers
  types.ts              # Shared TypeScript types
.env.example            # Environment variable template
```

## Deployment

Deploy to Vercel:
1. Push this repo to GitHub
2. Import at [vercel.com/new](https://vercel.com/new)
3. Add `GROQ_API_KEY` in the Vercel environment variables
4. Deploy
