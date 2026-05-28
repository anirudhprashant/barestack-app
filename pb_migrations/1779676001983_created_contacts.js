/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection(
{
  "id": "pbc_1779676001983",
  "system": false,
  "type": "base",
  "name": "contacts",
  "fields": [
    {
      "autogeneratePattern": "[a-z0-9]{15}",
      "hidden": false,
      "id": "text1779676001983",
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
      "id": "text6iv987v79",
      "name": "name",
      "type": "text",
      "required": true,
      "hidden": false,
      "presentable": false,
      "system": false,
      "min": 0,
      "pattern": "",
      "max": 500
    },
    {
      "id": "emaims0y5aipw",
      "name": "email",
      "type": "email",
      "required": true,
      "hidden": false,
      "presentable": false,
      "system": false
    },
    {
      "id": "text8vre0autt",
      "name": "phone",
      "type": "text",
      "required": false,
      "hidden": false,
      "presentable": false,
      "system": false,
      "max": 100
    },
    {
      "id": "textqaiz1l9ig",
      "name": "company",
      "type": "text",
      "required": false,
      "hidden": false,
      "presentable": false,
      "system": false,
      "max": 500
    },
    {
      "id": "text97q3o9uj6",
      "name": "tags",
      "type": "text",
      "required": false,
      "hidden": false,
      "presentable": false,
      "system": false,
      "max": 1000
    },
    {
      "id": "textv2dfhpz91",
      "name": "import_batch_id",
      "type": "text",
      "required": false,
      "hidden": false,
      "presentable": false,
      "system": false,
      "max": 100
    },
    {
      "id": "text6s515aazx",
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
  const collection = app.findCollectionByNameOrId("contacts");
  return app.delete(collection);
});
