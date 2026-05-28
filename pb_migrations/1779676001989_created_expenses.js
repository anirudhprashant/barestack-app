/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection(
{
  "id": "pbc_1779676001989",
  "system": false,
  "type": "base",
  "name": "expenses",
  "fields": [
    {
      "autogeneratePattern": "[a-z0-9]{15}",
      "hidden": false,
      "id": "text1779676001989",
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
      "id": "datebdokhl8ib",
      "name": "date",
      "type": "date",
      "required": true,
      "hidden": false,
      "presentable": false,
      "system": false
    },
    {
      "id": "seleksmezbafl",
      "name": "category",
      "type": "select",
      "required": true,
      "hidden": false,
      "presentable": false,
      "system": false,
      "values": [
        "Travel",
        "Meals",
        "Equipment",
        "Software",
        "Other"
      ],
      "maxSelect": 1
    },
    {
      "id": "numb43baosgo4",
      "name": "amount",
      "type": "number",
      "required": true,
      "hidden": false,
      "presentable": false,
      "system": false
    },
    {
      "id": "textgtjlqtccy",
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
      "id": "text8ux3tbnoh",
      "name": "project_id",
      "type": "text",
      "required": false,
      "hidden": false,
      "presentable": false,
      "system": false,
      "max": 100
    },
    {
      "id": "text0lfywm5x3",
      "name": "receipt_url",
      "type": "text",
      "required": false,
      "hidden": false,
      "presentable": false,
      "system": false,
      "max": 2000
    },
    {
      "id": "textv19q1kw2u",
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
  const collection = app.findCollectionByNameOrId("expenses");
  return app.delete(collection);
});
