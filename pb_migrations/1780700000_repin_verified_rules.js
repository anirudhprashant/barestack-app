/// <reference path="../pb_data/types.d.ts" />
// Idempotent defense-in-depth: re-apply the verified-owner rule to every data
// collection.
//
// 1780500000_require_verified_for_data introduced the
// `@request.auth.verified = true && user = @request.auth.id` gate, but its
// applyRule() silently `continue`s on any per-collection miss (try/catch +
// `if (!c) continue`). If a collection was missing/renamed when that migration
// ran, it silently kept the looser non-verified initial rules from its
// `created_*` migration. This migration heals that: it re-applies the same
// VERIFIED_RULE to all 10 data collections after everything else has settled, so
// any partial-fallback state is restored. On a healthy DB this is a no-op; it
// changes no behavior and introduces no new rule. The down-migration falls back
// to OWNER_RULE (owner isolation intact, matching 1780500000's down-path).
const DATA_COLLECTIONS = [
  "contacts", "deals", "projects", "tasks", "invoices",
  "time_entries", "expenses", "notes", "recent_activity", "import_batches",
];

const VERIFIED_RULE = '@request.auth.id != "" && @request.auth.verified = true && user = @request.auth.id';
const OWNER_RULE = '@request.auth.id != "" && user = @request.auth.id';

function applyRule(app, collections, rule) {
  for (const name of collections) {
    let c;
    try { c = app.findCollectionByNameOrId(name); } catch (_) { continue; }
    if (!c) continue;
    c.listRule = rule;
    c.viewRule = rule;
    c.createRule = rule;
    c.updateRule = rule;
    c.deleteRule = rule;
    app.save(c);
  }
}

migrate((app) => {
  applyRule(app, DATA_COLLECTIONS, VERIFIED_RULE);
}, (app) => {
  applyRule(app, DATA_COLLECTIONS, OWNER_RULE);
});