# NameTags Product Film

This folder contains a code-made 50 second NameTags product film. It is intentionally a clean SaaS motion piece rather than AI-generated footage: the QR is real, typography is selectable, and every colour is part of the NameTags system.

## Compositions

- `NameTagsFilmPreview`: 1920x1080, 30fps. Use this for review and quick revisions.
- `NameTagsFilm`: 3840x2160, 60fps. Use this for the final 4K export.

## Commands

```bash
npm run video:studio
npm run video:preview
npm run video:4k
```

Renders are written to the Git-ignored `out/` folder.

## Story

1. Event inputs converge into one calm starting point.
2. Subway Mode turns an event source into a useful research brief.
3. Questions become natural, contextual conversation starters.
4. A link vault becomes an event-specific QR Room Pass.
5. A scanner sees a simple public card and chooses whether to share contact details.
6. The same event context becomes an editable follow-up queue.
7. NameTags closes on `Networking, without the pressure.`

The only QR target is `https://nametags-network.vercel.app`; change `PRODUCTION_URL` in `NameTagsFilm.tsx` if the production URL changes.
