## Changes
- Use `table-fixed w-full` on the CRM table to prevent auto column expansion.
- Add a `colgroup` to define consistent widths for `Name, Company, Email, Phone, Stage, Tags, Actions`.
- Normalize padding/alignment for `th` and `td` (already consistent with `p-4`, keep it).
- Constrain controls:
  - Stage select → fixed width (`w-28`).
  - Tags container → `max-w-[220px] overflow-hidden flex flex-wrap gap-2`.
  - Actions group → fixed width (`w-28`) with `justify-between`.

## Scope & Safety
- Changes are limited to `pages/CRM.tsx` markup; no logic changes.
- Keeps your current visual style and components.

## Verification
- Rebuild without stopping the running preview server on `localhost:3000`.
- Confirm headers and rows align; columns remain evenly spaced regardless of content widths.

## No Push
- Apply locally and build; I will not push unless you ask.