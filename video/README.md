# NameTags Product Film

This folder contains a code-made 65 second NameTags product film. The current film is a high-motion software piece: white `N` on coral, event-card rain, a fast research orbit, a QR Room Pass hero, a three-step pain-to-solution map, and a handoff into a live product demo. It is intentionally code-made rather than AI-generated footage: the QR is real, typography is selectable, and every colour is part of the NameTags system.

## Compositions

- `NameTagsFilmPreview`: 1920x1080, 24fps. Use this for review and quick revisions.
- `NameTagsFilm`: 3840x2160, 60fps. Use this for the final 4K export.

## Commands

```bash
npm run video:studio
npm run video:preview
npm run video:4k
```

Renders are written to the Git-ignored `out/` folder.

## Story

1. A rain of cards, mail, social and chat links makes the networking overload tangible.
2. A moving desk scene turns anxiety and tabs into a focused mobile moment.
3. Floating event fragments orbit and then converge around a single source of truth.
4. Cards are pulled into NameTags and become one practical event plan.
5. Subway Mode resolves a source into tailored questions.
6. A real QR Room Pass gets the main hero moment.
7. Research, the pass, and a follow-up queue become a clear `Before / During / After` pain-to-solution map.
8. The final slate hands directly into a live product demo.

The only QR target is `https://nametags-network.vercel.app`; change `PRODUCTION_URL` in `NameTagsFilm.tsx` if the production URL changes.
