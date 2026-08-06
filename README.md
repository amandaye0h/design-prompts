# Design Prompts

A copy-ready prompt library for the design team, built with Vite, React, and shadcn/ui.

## Local

```bash
npm install
npm run dev
```

## Add prompts

Edit `public/prompts.json`. Each prompt needs:

```json
{
  "id": "unique-id",
  "title": "Short title",
  "category": "Discovery",
  "requiresAttachment": true,
  "prompt": "Full prompt text…"
}
```

Set `requiresAttachment: true` to show an **[Insert Screenshot]** badge — a cue that the prompt needs a screenshot attached when used.

## Hosting

Published via GitHub Pages from the `main` branch (`npm run build` → `dist`).
