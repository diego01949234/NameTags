# NameTags Product Film

This folder contains code-made NameTags videos. The original 65 second product film is a high-motion software piece. The live demo is a 100 second landscape walkthrough using real NameTags screens inside a portrait phone frame. `NameTagsMotionTitles` is a separate, screen-free motion package to cut around a genuine mobile screen recording, rather than pretending static screenshots are a live product interaction.

## Compositions

- `NameTagsFilmPreview`: 1920x1080, 24fps. Use this for review and quick revisions.
- `NameTagsFilm`: 3840x2160, 60fps. Use this for the final 4K export.
- `NameTagsLiveDemoPreview`: 1920x1080, 30fps, 100 seconds. The landscape live mobile demo.
- `NameTagsLiveDemo`: 3840x2160, 60fps, 100 seconds. The 4K live mobile demo.
- `NameTagsMotionTitlesPreview`: 1920x1080, 30fps, 45 seconds. The typography, AI-analysis, QR and follow-up motion package for a real screen-recorded demo.
- `NameTagsMotionTitles`: 3840x2160, 60fps, 45 seconds. The 4K motion package.

## Commands

```bash
npm run video:studio
npm run video:preview
npm run video:4k
npm run video:demo
npm run video:demo:4k
npm run video:titles
npm run video:titles:4k
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

## Live demo story

1. Open a real event in the mobile app.
2. Scroll the real research screen, with subtitles explaining Subway Mode.
3. Zoom into the actual selected-link and scanner-preview controls.
4. Use the real QR Room Pass and scan animation.
5. Scroll the real follow-up queue and highlight the editable AI draft.

The source screens live in `public/video-demo/`; they were captured from the
working local NameTags app. `nametags-live-demo.srt` is the matching subtitle
file for editors.

## Motion-title edit plan

Use `NameTagsMotionTitles` as the energetic story layer, then put a genuine
screen recording of the app immediately after each related title: Research,
selected links + QR, and Follow-up. The 45-second motion package contains no
phone shell and no application screenshots; it intentionally leaves the real
interaction evidence to a proper device recording.
