/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection(
{
  "id": "pbc_1779676001987",
  "system": false,
  "type": "base",
  "name": "invoices",
  "fields": [
    {
      "autogeneratePattern": "[a-z0-9]{15}",
      "hidden": false,
      "id": "text1779676001987",
      "max": 15,
      "min": 15,
      "name": "id",
      "pattern": "^[a-z0-9]+$",
      "presentable": false,
      "primaryKey": true,
      "required": true,
      "system": true,
      "type": "text"
    },
    {
      "id": "textzmr0u81hz",
      "name": "invoice_number",
      "type": "text",
      "required": true,
      "hidden": false,
      "presentable": false,
      "system": false,
      "min": 0,
      "pattern": "",
      "max": 100
    },
    {
      "id": "textr7pepa6og",
      "name": "client_id",
      "type": "text",
      "required": true,
      "hidden": false,
      "presentable": false,
      "system": false,
      "max": 100
    },
    {
      "id": "date0s6heeu77",
      "name": "issue_date",
      "type": "date",
      "required": true,
      "hidden": false,
      "presentable": false,
      "system": false
    },
    {
      "id": "dateaplmg5vch",
      "name": "due_date",
      "type": "date",
      "required": true,
      "hidden": false,
      "presentable": false,
      "system": false
    },
    {
      "id": "jsontpwk7vvez",
      "name": "line_items",
      "type": "json",
      "required": false,
      "hidden": false,
      "presentable": false,
      "system": false
    },
    {
      "id": "numbkfecqhgcq",
      "name": "tax_rate",
      "type": "number",
      "required": false,
      "hidden": false,
      "presentable": false,
      "system": false
    },
    {
      "id": "selevp041hpan",
      "name": "status",
      "type": "select",
      "required": true,
      "hidden": false,
      "presentable": false,
      "system": false,
      "values": [
        "Draft",
        "Sent",
        "Paid",
        "Overdue"
      ],
      "maxSelect": 1
    },
    {
      "id": "dategf9q94t5x",
      "name": "paid_date",
      "type": "date",
      "required": false,
      "hidden": false,
      "presentable": false,
      "system": false
    },
    {
      "id": "text9j54svhri",
      "name": "payment_method",
      "type": "text",
      "required": false,
      "hidden": false,
      "presentable": false,
      "system": false,
      "max": 200
    },
    {
      "id": "textqt2plmxaf",
      "name": "user",
      "type": "text",
      "required": true,
      "hidden": false,
      "presentable": false,
      "system": false,
      "max": 100
    }
  ],
  "indexes": [],
  "listRule": "@request.auth.id != \"\" && user = @request.auth.id",
  "viewRule": "@request.auth.id != \"\" && user = @request.auth.id",
  "createRule": "@request.auth.id != \"\" && user = @request.auth.id",
  "updateRule": "@request.auth.id != \"\" && user = @request.auth.id",
  "deleteRule": "@request.auth.id != \"\" && user = @request.auth.id"
}
  );
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("invoices");
  return app.delete(collection);
});
