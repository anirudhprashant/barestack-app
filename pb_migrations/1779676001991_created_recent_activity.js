/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection(
{
  "id": "pbc_1779676001991",
  "system": false,
  "type": "base",
  "name": "recent_activity",
  "fields": [
    {
      "autogeneratePattern": "[a-z0-9]{15}",
      "hidden": false,
      "id": "text1779676001991",
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
      "id": "datexgyxg9k20",
      "name": "timestamp",
      "type": "date",
      "required": true,
      "hidden": false,
      "presentable": false,
      "system": false
    },
    {
      "id": "seleyezmt0wt6",
      "name": "type",
      "type": "select",
      "required": true,
      "hidden": false,
      "presentable": false,
      "system": false,
      "values": [
        "CONTACT_ADDED",
        "PROJECT_CREATED",
        "INVOICE_CREATED",
        "INVOICE_SENT",
        "TASK_COMPLETED",
        "DEAL_ADDED",
        "EXPENSE_ADDED"
      ],
      "maxSelect": 1
    },
    {
      "id": "textq3pns0wva",
      "name": "description",
      "type": "text",
      "required": true,
      "hidden": false,
      "presentable": false,
      "system": false,
      "min": 0,
      "pattern": "",
      "max": 2000
    },
    {
      "id": "textkpsq5r0rw",
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
  const collection = app.findCollectionByNameOrId("recent_activity");
  return app.delete(collection);
});
