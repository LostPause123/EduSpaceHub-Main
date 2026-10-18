# Branching and Replacement Plan

## Current project layout

- `src/` contains the React application and its student, tutor, and admin features.
- `app/` contains Next.js routes. Its root page imports `src/App.tsx`, so it partially duplicates the Vite application entry path.
- `package.json` defaults `dev` and `build` to Next.js, while `AGENTS.md` describes Vite as canonical. Choose one production runtime before replacing or deleting either app tree.
- `server/` contains the Express API, controllers, routes, and SQL migration. Treat it as a separate service boundary unless a feature changes both its API contract and its UI.
- `.figma/make/dev.json` controls dependency-triggered installs and server restarts. It does not control application routing or Git branches.

## Comparison with GitHub `main`

The public `main` branch is at commit `a24c6fa` (`Add .next to gitignore`). The local project contains newer feature code, not just a different folder layout:

- GitHub `src/App.tsx` contains the login/register and student flows. The local version also wires password recovery and admin/tutor flows.
- Local admin and tutor screens/routes are absent from GitHub `main`, including `src/pages/admin/`, `src/pages/tutor/`, `app/admin/`, and `app/tutor/`.
- Local reset-password, admin API, and learning-materials backend files are absent from `main` (for example `src/pages/auth/ResetPassword.tsx`, `server/routes/adminRoutes.js`, `server/controllers/materialController.js`, and the materials service/migration).
- GitHub `vite.config.ts` imports `.figma/make/site.json`, but that file returns 404 on `main`. The local copy contains it and its Vite build succeeds. Include this file in a Vite deployment update; `dev.json` is optional to the production build.

This is evidence for a migration PR, not a reason to overwrite every remote file. Review the changed-file list and preserve remote-only setup and secrets.

## Suggested feature branches

Create short-lived branches from `main`, then merge each through a pull request:

- `migration/choose-app-runtime` for resolving the Next.js/Vite entry-point and deployment mismatch.
- `feature/auth-profiles` for authentication, student profiles, and tutor profiles.
- `feature/student-bookings` for session discovery, booking, and booking details; include corresponding `server/controllers/bookingController.js` or route changes only when the API contract changes.
- `feature/tutor-schedules` for tutor availability and scheduling, including the relevant UI and API changes together when they must ship atomically.
- `feature/learning-materials` for the materials UI, `server/controllers/materialController.js`, `server/services/materialService.js`, and related migration/API changes.
- `feature/admin-management` for admin-facing tutor, student, booking, and schedule workflows.

Avoid permanent branches named after individual folders. Branches should represent a reviewable change, not a second copy of the repository.

## Avoiding conflicting edits

- Decide whether Next.js or Vite is the production app before removing routes or changing default scripts. The current build configuration is mixed; a successful Vite build alone does not prove Next.js routes are redundant.
- Keep changes to shared navigation and types (`src/App.tsx`, `src/types.ts`) small. If several branches need the same files, merge the routing/types change first, then update the remaining branches from the new `main`.
- Keep backend schema/API changes with their consuming UI when they need to deploy together. Otherwise, merge the API contract first and build the UI against that contract.
- Replace only the files the new implementation actually supersedes. Review deletions and preserve `.env`, Supabase configuration, migrations, and server code unless the replacement explicitly includes equivalents.
- Use pull requests and resolve conflicts against the latest `main`; do not force-push or upload a whole folder over the GitHub repository without reviewing the file-level diff.

## Safe GitHub replacement workflow

Run these commands from a real clone of the GitHub repository. The extracted project folder is the candidate source; review and copy only its intended updates into the clone. Replace the paths with your actual folders.

```powershell
git clone https://github.com/LostPause123/EduSpaceHub-Main.git
Set-Location .\EduSpaceHub-Main
git switch main
git pull --ff-only origin main
git switch -c migration/replace-app
$source = 'C:\Users\Francis Cano\Downloads\EduSpace_Tutoring_Hub-20261018T071329Z-1-001\EduSpace_Tutoring_Hub'

# Copy reviewed source paths from the extracted project into this clone.
# Do not copy .env, node_modules, .next, dist, or local generated state.
# Check each source/destination pair and copy only files intended for this PR.

git status --short
git diff --stat
git diff --check
# Run the build for the selected production runtime.
git add <reviewed-paths>
git diff --cached --stat
git commit -m "Replace application implementation"
git push -u origin migration/replace-app
```

Open a pull request and verify its changed-file list before merging. Do not use `git add -A` for a broad replacement unless every deletion and addition has been reviewed.

## Current status

The candidate update has been pushed to `migration/replace-app` as commit `07f6853`; `main` remains unchanged. The Next.js and Vite production builds pass with temporary placeholder Supabase keys, and no `.env` or generated build output is included. Vite reports a bundle-size warning above 500 kB.

Create a pull request from `migration/replace-app` to `main` at `https://github.com/LostPause123/EduSpaceHub-Main/pull/new/migration/replace-app`. Review the changed-file list and confirm the production runtime before merging.