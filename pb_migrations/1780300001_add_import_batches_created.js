/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("import_batches");
  collection.fields.add(new Field({
    "hidden": false,
    "id": "autodate_import_batches_created",
    "name": "created",
    "onCreate": true,
    "onUpdate": false,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }));
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("import_batches");
  collection.fields.removeById("autodate_import_batches_created");
  return app.save(collection);
});
