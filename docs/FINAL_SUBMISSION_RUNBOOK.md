# NameTags Final Submission Runbook

Use this checklist in order. It is designed for the final Build Week submission,
not for another product-development pass.

## 1. Freeze the project

- [ ] Do not add new product features.
- [ ] Confirm the public demo opens at `https://nametags-network.vercel.app`.
- [ ] Use the no-login sample event as the primary reviewer path.
- [ ] Confirm the production QR opens the deployed domain, not `localhost`.
- [ ] Do one real owner -> scanner -> consent -> follow-up test if time permits.
- [ ] Do not claim that test is complete until it has actually happened.

## 2. Publish the code repository

- [ ] Create a public GitHub repository called `nametags` without initializing
  it with another README or license.
- [ ] Follow [`GITHUB_PUBLISH.md`](./GITHUB_PUBLISH.md) to add `origin` and
  push the existing `main` branch.
- [ ] Open the GitHub repository and confirm these files are readable:
  `README.md`, `LICENSE`, `BUILD_WEEK.md`,
  `docs/BUILD_WEEK_SUBMISSION.md`, and `supabase/schema.sql`.
- [ ] Confirm `.env.local`, API keys, Supabase secret keys, and personal data
  are not present in the GitHub file list or commit history.
- [ ] Copy the public GitHub repository URL.

## 3. Complete required Codex evidence

- [ ] In the primary NameTags Codex development thread, run `/feedback`.
- [ ] Choose the option that says most core functionality is complete.
- [ ] Copy the generated Session ID exactly.
- [ ] Paste it into the Devpost form and replace the `PENDING` marker in
  `BUILD_WEEK.md` for the repository record.

## 4. Finalize the demo video

- [ ] Keep the final public YouTube video under three minutes.
- [ ] Include clear audio and a real product demo, not only a concept montage.
- [ ] Show the complete context path: event source -> research -> selected links
  -> QR scanner card/consent -> follow-up.
- [ ] State out loud how Codex accelerated the build and where GPT-5.6 is used.
- [ ] Use only original visuals, cleared music, and assets you have permission
  to show. Avoid third-party logos, founder names, or music unless you have a
  clear right to use them.
- [ ] Set the YouTube video to **Public** and copy its URL.

## 5. Fill the Devpost form

- [ ] Open `https://openai.devpost.com` and choose **Submit a project**.
- [ ] Project name: `NameTags`.
- [ ] Track: `Apps for Your Life`.
- [ ] Live app URL: `https://nametags-network.vercel.app`.
- [ ] Code repository URL: paste the public GitHub URL.
- [ ] Demo video URL: paste the public YouTube URL.
- [ ] Paste the short description and product sections from
  [`BUILD_WEEK_SUBMISSION.md`](./BUILD_WEEK_SUBMISSION.md).
- [ ] Rewrite the first-person sections in your own voice before submitting;
  do not paste the outline unchanged.
- [ ] Paste the real `/feedback` Session ID.

## 6. Last 10-minute audit

- [ ] Every submission field, video, and testing instruction is in English.
- [ ] The demo app is free and accessible to judges through the no-login sample
  path.
- [ ] The README clearly explains setup, sample data, testing, Codex, and
  GPT-5.6.
- [ ] The repository has a visible MIT license.
- [ ] No factual claim says a test, pilot, user count, or integration happened
  unless it really happened.
- [ ] Submit the final Devpost project, then save a screenshot of the submitted
  confirmation page.
