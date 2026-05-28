/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection(
{
  "id": "pbc_1779676001985",
  "system": false,
  "type": "base",
  "name": "projects",
  "fields": [
    {
      "autogeneratePattern": "[a-z0-9]{15}",
      "hidden": false,
      "id": "text1779676001985",
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
      "id": "textghsy768o6",
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
      "id": "textxe9okcjrh",
      "name": "client_id",
      "type": "text",
      "required": true,
      "hidden": false,
      "presentable": false,
      "system": false,
      "max": 100
    },
    {
      "id": "seles4vcxpll6",
      "name": "status",
      "type": "select",
      "required": true,
      "hidden": false,
      "presentable": false,
      "system": false,
      "values": [
        "Active",
        "Archived",
        "Completed"
      ],
      "maxSelect": 1
    },
    {
      "id": "numb890w1bpk5",
      "name": "budget",
      "type": "number",
      "required": false,
      "hidden": false,
      "presentable": false,
      "system": false
    },
    {
      "id": "numb3o2cofr66",
      "name": "estimated_hours",
      "type": "number",
      "required": false,
      "hidden": false,
      "presentable": false,
      "system": false
    },
    {
      "id": "textk9t1bz3b8",
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
  const collection = app.findCollectionByNameOrId("projects");
  return app.delete(collection);
});
