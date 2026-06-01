/// <reference path="../pb_data/types.d.ts" />
// Secure + seamless email verification.
//
// `users.authRule` is relaxed to "" so a freshly signed-up (still unverified)
// user can obtain a session — the frontend holds them at a verify gate. Real
// protection moves to the data layer: every owned collection now also requires
// `@request.auth.verified = true`, so an unverified token cannot read or write
// any data until the email is confirmed.
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
  let users;
  try { users = app.findCollectionByNameOrId("users"); } catch (_) { users = null; }
  if (users) { users.authRule = ""; app.save(users); }
}, (app) => {
  applyRule(app, DATA_COLLECTIONS, OWNER_RULE);
  let users;
  try { users = app.findCollectionByNameOrId("users"); } catch (_) { users = null; }
  if (users) { users.authRule = "verified = true"; app.save(users); }
});
