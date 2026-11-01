# AGENTS.md - SAV-E-landing

Repo rails for coding agents working in this project.

## Before Editing

- Confirm the current branch and dirty state with `git status --short --branch`.
- Read repo-local docs first: `README*`, package/config files, app entrypoints, and nearby tests.
- Preserve unrelated user changes. Do not revert, reformat, or clean files outside the task scope.
- Keep changes surgical. Prefer the existing stack and local patterns over new abstractions.

## Verification

Use the smallest meaningful check for the changed surface:

- JavaScript/TypeScript: prefer existing `check`, `test`, `lint`, `typecheck`, or `build` scripts from `package.json`.
- Swift/Xcode: identify project/workspace, scheme, simulator/device, deployment target, then run the narrow `xcodebuild` build/test command.
- Solidity/EVM: run the local Foundry/Hardhat tests relevant to touched contracts or scripts.
- Python: run targeted tests or `python -m py_compile` for touched scripts when no test suite exists.
- Docs/config only: run formatting/link/containment checks if the repo provides them; otherwise state why runtime verification is not applicable.

Never claim verification passed if the command was not run. Report skipped checks with the exact reason.

## Boundaries

- Do not commit secrets, private keys, tokens, credentials, customer data, or local machine dumps.
- Do not deploy, publish, submit forms, send messages, merge PRs, change permissions, create credentials, or make financial/auth/security changes without explicit action-time approval.
- Do not delete meaningful local or cloud data unless explicitly asked for that exact action.
- For auth, payment, wallet, parser/import, dependency, or externally exposed changes, include a security review note or explain why it is not applicable.

## Done Criteria

A handoff is complete only when it includes:

- changed files
- verification command and result
- skipped checks, if any
- risks or follow-up work
- commit/PR status, if shipping was requested

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
