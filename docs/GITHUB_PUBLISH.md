# Publish NameTags to GitHub

## Current local status

- The local repository is on the `main` branch.
- It already contains a MIT `LICENSE`, a detailed README, Build Week evidence,
  and no `.env.local` or production secrets are tracked.
- No GitHub remote is configured yet.
- GitHub CLI is not installed on this machine, so a GitHub repository cannot be
  safely guessed or created automatically from the terminal.

## Recommended: create a public repository

1. Go to [github.com/new](https://github.com/new).
2. Set **Repository name** to `nametags`.
3. Set visibility to **Public**.
4. Do **not** initialize it with a README, license, or `.gitignore`; this local
   project already has all three.
5. Click **Create repository** and copy the HTTPS URL. It will look like
   `https://github.com/YOUR-USERNAME/nametags.git`.
6. From the NameTags project folder, run:

```bash
git remote add origin https://github.com/YOUR-USERNAME/nametags.git
git push -u origin main
```

7. Open the repository in GitHub and verify that `README.md`, `LICENSE`,
   `BUILD_WEEK.md`, `docs/BUILD_WEEK_SUBMISSION.md`, and `supabase/schema.sql`
   are visible. Then copy that repository URL into Devpost.

## Private repository alternative

If the repository must stay private, open **Settings -> Collaborators and
teams** in GitHub and invite both of these accounts before submitting:

- `testing@devpost.com`
- `build-week-event@openai.com`

Public is simpler for judging because reviewers can inspect the README and MIT
license without waiting for access approval. Never make a repository public if
it contains `.env.local`, API keys, database secrets, or real contact data.

## What to do after creating the GitHub repository

Return to this Codex task with the copied HTTPS repository URL. Codex can then
attach the remote, push the existing `main` history, and verify the result.
