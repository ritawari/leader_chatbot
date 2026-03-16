# Leader Chatbot

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


