/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection(
{
  "id": "pbc_1779676001986",
  "system": false,
  "type": "base",
  "name": "tasks",
  "fields": [
    {
      "autogeneratePattern": "[a-z0-9]{15}",
      "hidden": false,
      "id": "text1779676001986",
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
      "id": "text853du8dt5",
      "name": "title",
      "type": "text",
      "required": true,
      "hidden": false,
      "presentable": false,
      "system": false,
      "min": 0,
      "pattern": "",
      "max": 1000
    },
    {
      "id": "textwif3c7cgr",
      "name": "project_id",
      "type": "text",
      "required": true,
      "hidden": false,
      "presentable": false,
      "system": false,
      "max": 100
    },
    {
      "id": "texte8x7ykp4b",
      "name": "assigned_to",
      "type": "text",
      "required": false,
      "hidden": false,
      "presentable": false,
      "system": false,
      "max": 200
    },
    {
      "id": "date4jpjtdfp6",
      "name": "due_date",
      "type": "date",
      "required": true,
      "hidden": false,
      "presentable": false,
      "system": false
    },
    {
      "id": "numbeozcvv3rm",
      "name": "estimated_hours",
      "type": "number",
      "required": false,
      "hidden": false,
      "presentable": false,
      "system": false
    },
    {
      "id": "seleh83w9nkvj",
      "name": "status",
      "type": "select",
      "required": true,
      "hidden": false,
      "presentable": false,
      "system": false,
      "values": [
        "To Do",
        "In Progress",
        "Done"
      ],
      "maxSelect": 1
    },
    {
      "id": "texti8hacifnn",
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
  const collection = app.findCollectionByNameOrId("tasks");
  return app.delete(collection);
});
