/// <reference path="../pb_data/types.d.ts" />
// Widen recent_activity.type to include INVOICE_UPDATED and INVOICE_DELETED.
// The frontend already logs these; without them PocketBase silently rejects
// the create (the call is wrapped in a best-effort try/catch), so deletions
// and edits never appeared in the activity feed.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("recent_activity");
  const field = collection.fields.find((f) => f.name === "type");
  field.values = [
    "CONTACT_ADDED",
    "PROJECT_CREATED",
    "INVOICE_CREATED",
    "INVOICE_UPDATED",
    "INVOICE_SENT",
    "INVOICE_DELETED",
    "TASK_COMPLETED",
    "DEAL_ADDED",
    "EXPENSE_ADDED",
  ];
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("recent_activity");
  const field = collection.fields.find((f) => f.name === "type");
  field.values = [
    "CONTACT_ADDED",
    "PROJECT_CREATED",
    "INVOICE_CREATED",
    "INVOICE_SENT",
    "TASK_COMPLETED",
    "DEAL_ADDED",
    "EXPENSE_ADDED",
  ];
  return app.save(collection);
});
