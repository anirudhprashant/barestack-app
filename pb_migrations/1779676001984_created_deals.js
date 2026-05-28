/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection(
{
  "id": "pbc_1779676001984",
  "system": false,
  "type": "base",
  "name": "deals",
  "fields": [
    {
      "autogeneratePattern": "[a-z0-9]{15}",
      "hidden": false,
      "id": "text1779676001984",
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
      "id": "textdl95ur3mk",
      "name": "contact_id",
      "type": "text",
      "required": true,
      "hidden": false,
      "presentable": false,
      "system": false,
      "max": 100
    },
    {
      "id": "numbr3me8lb1q",
      "name": "value",
      "type": "number",
      "required": true,
      "hidden": false,
      "presentable": false,
      "system": false
    },
    {
      "id": "sele5vnvanw4t",
      "name": "stage",
      "type": "select",
      "required": true,
      "hidden": false,
      "presentable": false,
      "system": false,
      "values": [
        "Lead",
        "Qualified",
        "Proposal",
        "Won",
        "Lost"
      ],
      "maxSelect": 1
    },
    {
      "id": "dateeit9bw16z",
      "name": "last_interaction",
      "type": "date",
      "required": false,
      "hidden": false,
      "presentable": false,
      "system": false
    },
    {
      "id": "textbvt15e1me",
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
  const collection = app.findCollectionByNameOrId("deals");
  return app.delete(collection);
});
