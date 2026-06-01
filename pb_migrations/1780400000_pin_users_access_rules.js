/// <reference path="../pb_data/types.d.ts" />
// Pin the default `users` auth collection rules to owner-only.
//
// The data collections all version-control their access rules, but the most
// sensitive collection (emails + password hashes) otherwise relies on whatever
// defaults the installed PocketBase version ships. Permissive list/view rules
// allow account/email enumeration, so we lock them down explicitly here.
//
// createRule is intentionally left untouched so public sign-up keeps working.
migrate((app) => {
  let users;
  try {
    users = app.findCollectionByNameOrId("users");
  } catch (_) {
    // users collection not bootstrapped yet — nothing to pin.
    return;
  }
  if (!users) return;

  users.listRule = "id = @request.auth.id";
  users.viewRule = "id = @request.auth.id";
  users.updateRule = "id = @request.auth.id";
  users.deleteRule = "id = @request.auth.id";

  return app.save(users);
}, (app) => {
  let users;
  try {
    users = app.findCollectionByNameOrId("users");
  } catch (_) {
    return;
  }
  if (!users) return;

  users.listRule = null;
  users.viewRule = null;
  users.updateRule = null;
  users.deleteRule = null;

  return app.save(users);
});
