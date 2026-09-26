/// <reference path="../pb_data/types.d.ts" />
// One business profile per user: the "From" block, currency, tax defaults and
// payment instructions that go on every invoice. Same verified-owner rules as
// every other data collection, plus a unique index on `user` so a second
// profile can't be created by a racing client.
const OWNER_READ = '@request.auth.id != "" && @request.auth.verified = true && user = @request.auth.id';
const OWNER_UPDATE = OWNER_READ + ' && @request.body.user:changed = false';

function text(id, name, max) {
  return { id: id, name: name, type: "text", max: max, required: false, hidden: false, presentable: false, system: false };
}

migrate((app) => {
  try {
    if (app.findCollectionByNameOrId("business_profiles")) return;
  } catch (_) {
    // not found: create it below
  }

  const collection = new Collection({
    id: "pbc_business_profiles",
    type: "base",
    name: "business_profiles",
    system: false,
    fields: [
      {
        autogeneratePattern: "[a-z0-9]{15}",
        hidden: false,
        id: "text_bp_id",
        max: 15,
        min: 15,
        name: "id",
        pattern: "^[a-z0-9]+$",
        presentable: false,
        primaryKey: true,
        required: true,
        system: true,
        type: "text",
      },
      { id: "text_bp_user", name: "user", type: "text", max: 100, required: true, hidden: false, presentable: false, system: false },
      text("text_bp_business_name", "business_name", 500),
      text("text_bp_address", "address", 2000),
      text("text_bp_email", "email", 500),
      text("text_bp_phone", "phone", 100),
      text("text_bp_website", "website", 500),
      text("text_bp_tax_id", "tax_id", 200),
      text("text_bp_currency", "currency", 3),
      { id: "number_bp_default_tax_rate", name: "default_tax_rate", type: "number", min: 0, max: 100, required: false, hidden: false, presentable: false, system: false },
      { id: "number_bp_payment_terms_days", name: "payment_terms_days", type: "number", min: 0, max: 365, onlyInt: true, required: false, hidden: false, presentable: false, system: false },
      text("text_bp_payment_instructions", "payment_instructions", 2000),
      text("text_bp_invoice_prefix", "invoice_prefix", 20),
      text("text_bp_invoice_footer", "invoice_footer", 500),
      { id: "autodate_bp_created", name: "created", type: "autodate", onCreate: true, onUpdate: false, hidden: false, presentable: false, system: false },
      { id: "autodate_bp_updated", name: "updated", type: "autodate", onCreate: true, onUpdate: true, hidden: false, presentable: false, system: false },
    ],
    indexes: ["CREATE UNIQUE INDEX `idx_business_profiles_user` ON `business_profiles` (`user`)"],
    listRule: OWNER_READ,
    viewRule: OWNER_READ,
    createRule: OWNER_READ,
    updateRule: OWNER_UPDATE,
    deleteRule: OWNER_READ,
  });
  return app.save(collection);
}, (app) => {
  try {
    const c = app.findCollectionByNameOrId("business_profiles");
    if (c) app.delete(c);
  } catch (_) {
    // already gone
  }
});
