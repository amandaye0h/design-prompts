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
  "category": "Critique",
  "prompt": "Full prompt text…"
}
```

## Hosting

Published via GitHub Pages from the `main` branch (`npm run build` → `dist`).
