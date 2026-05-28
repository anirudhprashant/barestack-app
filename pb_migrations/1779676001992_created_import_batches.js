/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection(
{
  "id": "pbc_1779676001992",
  "system": false,
  "type": "base",
  "name": "import_batches",
  "fields": [
    {
      "autogeneratePattern": "[a-z0-9]{15}",
      "hidden": false,
      "id": "text1779676001992",
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
      "id": "numb1sxtpf8vw",
      "name": "contact_count",
      "type": "number",
      "required": true,
      "hidden": false,
      "presentable": false,
      "system": false
    },
    {
      "id": "text9bk74ub21",
      "name": "file_name",
      "type": "text",
      "required": false,
      "hidden": false,
      "presentable": false,
      "system": false,
      "max": 500
    },
    {
      "id": "text5370j1za8",
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
  const collection = app.findCollectionByNameOrId("import_batches");
  return app.delete(collection);
});
