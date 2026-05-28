/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("notes");
  collection.fields.add(new Field({
    "hidden": false,
    "id": "autodate_notes_created",
    "name": "created",
    "onCreate": true,
    "onUpdate": false,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }));
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("notes");
  collection.fields.removeById("autodate_notes_created");
  return app.save(collection);
});
