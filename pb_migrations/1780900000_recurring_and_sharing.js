/// <reference path="../pb_data/types.d.ts" />
// v1.2: recurring invoices and client share links.
//
// 1. invoices.recurrence / invoices.next_issue_date
//    An invoice with a recurrence acts as a template: pb_hooks/recurring.pb.js
//    creates a new Draft copy whenever next_issue_date is reached, then moves
//    next_issue_date forward.
//
// 2. invoice_shares
//    A read-only snapshot of one invoice (lines, totals, business + client
//    details) that the owner can hand to a client as a link. Anyone can VIEW a
//    share by id only when they also present its secret token
//    (?token=...), so ids can't be guessed into access, and nobody can LIST
//    shares except the owner. The snapshot is what the client sees; the live
//    invoice and contact records stay owner-only.
const OWNER_READ = '@request.auth.id != "" && @request.auth.verified = true && user = @request.auth.id';
const OWNER_UPDATE = OWNER_READ + ' && @request.body.user:changed = false';

migrate((app) => {
  const invoices = app.findCollectionByNameOrId("invoices");
  if (!invoices.fields.getByName("recurrence")) {
    invoices.fields.add(new Field({
      id: "select_invoices_recurrence",
      name: "recurrence",
      type: "select",
      maxSelect: 1,
      values: ["weekly", "monthly", "quarterly", "yearly"],
      required: false, hidden: false, presentable: false, system: false,
    }));
  }
  if (!invoices.fields.getByName("next_issue_date")) {
    invoices.fields.add(new Field({
      id: "date_invoices_next_issue_date",
      name: "next_issue_date",
      type: "date",
      required: false, hidden: false, presentable: false, system: false,
    }));
  }
  app.save(invoices);

  let exists = false;
  try { exists = !!app.findCollectionByNameOrId("invoice_shares"); } catch (_) { exists = false; }
  if (!exists) {
    const shares = new Collection({
      id: "pbc_invoice_shares",
      type: "base",
      name: "invoice_shares",
      system: false,
      fields: [
        { autogeneratePattern: "[a-z0-9]{15}", hidden: false, id: "text_is_id", max: 15, min: 15, name: "id", pattern: "^[a-z0-9]+$", presentable: false, primaryKey: true, required: true, system: true, type: "text" },
        { id: "text_is_user", name: "user", type: "text", max: 100, required: true, hidden: false, presentable: false, system: false },
        { id: "text_is_invoice_id", name: "invoice_id", type: "text", max: 100, required: true, hidden: false, presentable: false, system: false },
        // 32+ random chars from the client; the pattern rejects short or odd tokens.
        { id: "text_is_token", name: "token", type: "text", min: 32, max: 64, pattern: "^[A-Za-z0-9_-]+$", required: true, hidden: false, presentable: false, system: false },
        { id: "json_is_snapshot", name: "snapshot", type: "json", maxSize: 200000, required: true, hidden: false, presentable: false, system: false },
        { id: "autodate_is_created", name: "created", type: "autodate", onCreate: true, onUpdate: false, hidden: false, presentable: false, system: false },
        { id: "autodate_is_updated", name: "updated", type: "autodate", onCreate: true, onUpdate: true, hidden: false, presentable: false, system: false },
      ],
      indexes: [
        "CREATE UNIQUE INDEX `idx_invoice_shares_invoice` ON `invoice_shares` (`invoice_id`)",
        "CREATE INDEX `idx_invoice_shares_user` ON `invoice_shares` (`user`)",
      ],
      listRule: OWNER_READ,
      // Public view requires the secret token; owners can always view.
      viewRule: '(@request.query.token != "" && @request.query.token = token) || (' + OWNER_READ + ')',
      createRule: OWNER_READ,
      updateRule: OWNER_UPDATE,
      deleteRule: OWNER_READ,
    });
    app.save(shares);
  }
}, (app) => {
  try {
    const shares = app.findCollectionByNameOrId("invoice_shares");
    if (shares) app.delete(shares);
  } catch (_) { /* gone */ }
  const invoices = app.findCollectionByNameOrId("invoices");
  for (const name of ["recurrence", "next_issue_date"]) {
    const f = invoices.fields.getByName(name);
    if (f) invoices.fields.removeById(f.id);
  }
  app.save(invoices);
});
