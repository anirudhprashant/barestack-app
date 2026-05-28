/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection(
{
  "id": "pbc_1779676001988",
  "system": false,
  "type": "base",
  "name": "time_entries",
  "fields": [
    {
      "autogeneratePattern": "[a-z0-9]{15}",
      "hidden": false,
      "id": "text1779676001988",
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
      "id": "textu9medh46k",
      "name": "project_id",
      "type": "text",
      "required": true,
      "hidden": false,
      "presentable": false,
      "system": false,
      "max": 100
    },
    {
      "id": "text3yl92hqwf",
      "name": "task_id",
      "type": "text",
      "required": false,
      "hidden": false,
      "presentable": false,
      "system": false,
      "max": 100
    },
    {
      "id": "date439c024dw",
      "name": "date",
      "type": "date",
      "required": true,
      "hidden": false,
      "presentable": false,
      "system": false
    },
    {
      "id": "numb1tjark5ih",
      "name": "hours",
      "type": "number",
      "required": true,
      "hidden": false,
      "presentable": false,
      "system": false
    },
    {
      "id": "textiyvs7knj8",
      "name": "description",
      "type": "text",
      "required": false,
      "hidden": false,
      "presentable": false,
      "system": false,
      "max": 5000
    },
    {
      "id": "boolont0djyv1",
      "name": "is_billable",
      "type": "bool",
      "required": false,
      "hidden": false,
      "presentable": false,
      "system": false
    },
    {
      "id": "text0v75g9g5z",
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
  const collection = app.findCollectionByNameOrId("time_entries");
  return app.delete(collection);
});
