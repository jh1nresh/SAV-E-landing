# Import one reviewed post entry

Stage B is a local, offline tool. It does not write to git, open PRs, merge, deploy,
fetch social pages, or change station status. Stage C is separate and waits for
founder confirmation that the GitHub App exists.

```bash
node scripts/add-place.mjs /path/to/entry.json --image /path/to/dish.jpg --check
node scripts/add-place.mjs /path/to/entry.json --image /path/to/dish.jpg > /tmp/place-pr.md
npm run check
npm run typecheck
npm run build
npm run test:unit
```

`--check` prints the intended files and review table without writing anything.
If `--image` is omitted, `_image.file` is used (relative paths resolve next to
the entry JSON). Only local JPEG `.jpg` and WebP `.webp` files are accepted;
image signatures, supplied SHA-256, destination containment and collisions are
checked. A signature/hash check does not establish image copyright or truth.

Input follows the GTM entry template: `name`, `stationSuggest` (or `stationId`),
`sourcePosts`, `fromPost`, optional `dish`, `area`, `exit`, `exitWalkMin`, `hours`,
and optional boolean `backfill`. Instagram input platform `instagram` is mapped
to the site's `ig`; URLs are copied exactly, never normalized or fetched.
Optional location/time fields require `fromPost`; missing/null values are omitted.
Hours with non-time notes (訂位／外帶／排隊) are rejected for correction upstream.

F-1 requires `status: 有`, meaningful `factsTakenFrom` version references and a
nonempty `evidence` list. `_image` requires a supported source and an accepted
`imageStatus` or `provenance.status`; an explicit 不進 gate is never bypassed by
`--image`. Licensed images require a written licence reference. The review table
preserves tool/date qualifiers and all `_` metadata, including conditional AI
provenance and removed-hours notes. These private fields and `fromPost` are never
written to site data. Do not commit raw entry drafts or private S1–S9 samples.

Output is `kind: post`, `priceNT: null`, `pricePending: true`, `verified: false`.
Any price field supplied by the input is rejected. IDs use the next number after
the station's highest current or historically committed sequence. A read-only
local `git log` reserves retired IDs, including deleted highest IDs. Full Git
history is required; shallow clones fail closed (future CI checkout needs full
history). No remote is fetched. Gaps such as retired `arena-1` are not filled. `--id station-N` may select a higher unused sequence, never a lower one.
The importer only appends and never deletes entries; committed removal history
remains the allocation authority.

`addedAt` defaults to today's Asia/Taipei date; `--added-at YYYY-MM-DD` sets a
non-future planned go-live date. It cannot precede the latest source post date.
The station's `updatedAt` and `_meta.asOf` advance when necessary; station status,
coordinates and other stores are unchanged. A delayed merge needs a date-only
correction and revalidation; the importer does not infer the eventual merge day.
Historical posts before `NEW_FLOW_START` default to `backfill: true`.

Re-running the same entry preserves its ID/date and produces no byte changes.
A conflicting ID, changed content or existing different image is rejected; use
an explicit correction PR. The write is serialized with `data/.add-place.lock`,
and the JSON is replaced atomically after validation. A failed JSON write removes
only an image created by that invocation. An abandoned lock after a process crash
requires checking the owning process before manual removal.

One post's data PR is limited to five entries. This CLI imports one entry per
invocation and does not enforce the later PR's batch/scope policy. Review the PR
diff; the workflow enforcing that policy belongs to Stage C. Human QA must still
check the source facts and image provenance. Passing this tool never authorizes
merge or deployment.

The public payload `app/metro/metro.public.json` is generated and ignored by Git.
`predev`, `prebuild`, `pretypecheck`, `prelint`, and `pretest` regenerate it;
`npm run check` still regenerates and scans the public output. A data PR therefore
contains the source data and image only, without a stale tracked public copy.
