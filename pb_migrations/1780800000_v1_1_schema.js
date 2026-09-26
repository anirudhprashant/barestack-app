/// <reference path="../pb_data/types.d.ts" />
// v1.1 schema: timestamps, ownership freeze, and the fields behind the new
// invoicing / project / pipeline features. Every step is idempotent (fields
// are only added when missing) so re-running on a partially-migrated DB heals
// it instead of failing.
//
// 1. `created` / `updated` autodate fields on every data collection. Most
//    collections were created without them, so the app had to sort by `-id`
//    (random order) and couldn't show "added on" dates. Rows that predate this
//    migration get an empty timestamp; the app treats that as "unknown".
//
// 2. Freeze the `user` owner field on update (SECURITY_AUDIT.md F4). The old
//    update rule only checked the *existing* owner, so a user could move one of
//    their records into someone else's account by sending `user: <other id>`.
//    Creates already require `user = @request.auth.id`.
//
// 3. New optional fields (all non-required, so existing rows stay valid):
//      invoices.notes             free text printed on the invoice
//      time_entries.invoice_id    set once the entry has been billed
//      projects.description / hourly_rate / due_date
//      tasks.description / priority
//      deals.title / expected_close
//
// 4. recent_activity.type widened for the new activity kinds.
const DATA_COLLECTIONS = [
  "contacts", "deals", "projects", "tasks", "invoices",
  "time_entries", "expenses", "notes", "recent_activity", "import_batches",
];

const OWNER_READ = '@request.auth.id != "" && @request.auth.verified = true && user = @request.auth.id';
const OWNER_UPDATE = OWNER_READ + ' && @request.body.user:changed = false';

const ACTIVITY_TYPES = [
  "CONTACT_ADDED",
  "PROJECT_CREATED",
  "INVOICE_CREATED",
  "INVOICE_UPDATED",
  "INVOICE_SENT",
  "INVOICE_PAID",
  "INVOICE_DELETED",
  "TASK_COMPLETED",
  "DEAL_ADDED",
  "DEAL_WON",
  "EXPENSE_ADDED",
  "TIME_LOGGED",
];

const NEW_FIELDS = {
  invoices: [
    { id: "text_invoices_notes", name: "notes", type: "text", max: 5000 },
  ],
  time_entries: [
    { id: "text_time_entries_invoice_id", name: "invoice_id", type: "text", max: 100 },
  ],
  projects: [
    { id: "text_projects_description", name: "description", type: "text", max: 5000 },
    { id: "number_projects_hourly_rate", name: "hourly_rate", type: "number", min: 0 },
    { id: "date_projects_due_date", name: "due_date", type: "date" },
  ],
  tasks: [
    { id: "text_tasks_description", name: "description", type: "text", max: 5000 },
    { id: "select_tasks_priority", name: "priority", type: "select", maxSelect: 1, values: ["Low", "Medium", "High"] },
  ],
  deals: [
    { id: "text_deals_title", name: "title", type: "text", max: 500 },
    { id: "date_deals_expected_close", name: "expected_close", type: "date" },
  ],
};

function hasField(collection, name) {
  return !!collection.fields.getByName(name);
}

migrate((app) => {
  for (const name of DATA_COLLECTIONS) {
    let c;
    try { c = app.findCollectionByNameOrId(name); } catch (_) { continue; }
    if (!c) continue;

    if (!hasField(c, "created")) {
      c.fields.add(new Field({
        id: "autodate_" + name + "_created",
        name: "created",
        type: "autodate",
        onCreate: true,
        onUpdate: false,
        hidden: false,
        presentable: false,
        system: false,
      }));
    }
    if (!hasField(c, "updated")) {
      c.fields.add(new Field({
        id: "autodate_" + name + "_updated",
        name: "updated",
        type: "autodate",
        onCreate: true,
        onUpdate: true,
        hidden: false,
        presentable: false,
        system: false,
      }));
    }

    for (const def of (NEW_FIELDS[name] || [])) {
      if (hasField(c, def.name)) continue;
      c.fields.add(new Field(Object.assign({ required: false, hidden: false, presentable: false, system: false }, def)));
    }

    if (name === "recent_activity") {
      const type = c.fields.getByName("type");
      if (type) type.values = ACTIVITY_TYPES;
    }

    c.listRule = OWNER_READ;
    c.viewRule = OWNER_READ;
    c.createRule = OWNER_READ;
    c.updateRule = OWNER_UPDATE;
    c.deleteRule = OWNER_READ;
    app.save(c);
  }
}, (app) => {
  // Down: restore the previous update rule and drop the new optional fields.
  // The autodate fields are kept (dropping them would lose data for nothing),
  // and the widened activity enum is left alone because existing rows may
  // already use the new values.
  for (const name of DATA_COLLECTIONS) {
    let c;
    try { c = app.findCollectionByNameOrId(name); } catch (_) { continue; }
    if (!c) continue;
    for (const def of (NEW_FIELDS[name] || [])) {
      const f = c.fields.getByName(def.name);
      if (f) c.fields.removeById(f.id);
    }
    c.updateRule = OWNER_READ;
    app.save(c);
  }
});
