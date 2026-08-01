# Changelog

All notable changes to BareStackOS are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Self-hosters: anything that requires you to change configuration, re-run
`install.sh`, or migrate data will be called out under **Breaking** with the
steps needed. If a release has no **Breaking** section, upgrading is a pull and
a rebuild.

## [1.0.0] - 2026-07-29

First tagged release. The app has been running in production since June 2026;
this tag marks the point where the backend, licence and security model settled
enough to pin a version to.

### Added

- CRM core: contacts, deals with a drag-and-drop kanban pipeline, and notes.
- Time tracking with a weekly bar-chart view.
- Invoicing with branded PDF export, including embedded fonts so invoices
  render identically wherever they are opened.
- Expense tracking.
- CSV import with per-batch history and an activity log.
- Email/password authentication with an email verification flow, including
  cross-device verification (prefilled email and a verified banner on sign-in).
- Self-host installer (`install.sh`) with a static server (`serve.cjs`).
- Opt-in demo auto-login, gated behind the `VITE_DEMO_EMAIL` and
  `VITE_DEMO_PASSWORD` environment variables. When they are unset the normal
  login flow is used, so this cannot weaken a real deployment.
- `SECURITY_AUDIT.md` documenting the threat model and the hardening work.

### Changed

- Backend settled on PocketBase, after earlier iterations on Convex and
  Supabase. PocketBase keeps the whole deployment to a single binary and a
  data directory, which is the point of self-hosting.
- Responsive across mobile and desktop.
- Design system pass: Instrument Serif headings, Inter body, brand palette.

### Security

- Server-side integrity hook for activity and import logs.
- `Strict-Transport-Security` emitted from the static server.
- Verified-owner data access rules, re-pinned idempotently on migration.
- Input bounds enforced at the `api.ts` `create()` chokepoint.
- `install.sh` prints and verifies a checksum, and documents TLS setup.
- TypeScript strict mode enabled; cascade deletes fixed.
- Upgraded to Vite 7, clearing all outstanding advisories.

### Breaking

- **Licence changed to AGPL-3.0.** Earlier revisions were MIT, then GPL-3.0,
  then GPL-3.0 with an added no-commercial-resale clause. That added clause
  contradicted GPL-3.0 section 7, which forbids further restrictions, so the
  result was not a valid open source licence and GitHub reported it as
  `NOASSERTION`. It is now plain AGPL-3.0 with no additional terms. If you run
  a modified version as a network service, AGPL-3.0 section 13 requires you to
  offer users the source of your modified version.

[1.0.0]: https://github.com/anirudhprashant/barestack-app/releases/tag/v1.0.0
