/// <reference path="../pb_data/types.d.ts" />
// Add an index on `user` for every data collection. Every query in the app
// filters by `user = @request.auth.id`; without these indexes each read is a
// full table scan that degrades as a user's data grows.
const COLLECTIONS = [
  "contacts", "deals", "projects", "tasks", "invoices",
  "time_entries", "expenses", "notes", "recent_activity", "import_batches",
];

migrate((app) => {
  for (const name of COLLECTIONS) {
    try {
      const collection = app.findCollectionByNameOrId(name);
      const idx = `CREATE INDEX \`idx_${name}_user\` ON \`${name}\` (\`user\`)`;
      if (!collection.indexes.includes(idx)) {
        collection.indexes.push(idx);
        app.save(collection);
      }
    } catch (e) {
      // Collection missing on a partial install: skip rather than abort.
    }
  }
}, (app) => {
  for (const name of COLLECTIONS) {
    try {
      const collection = app.findCollectionByNameOrId(name);
      collection.indexes = collection.indexes.filter((i) => !i.includes(`idx_${name}_user`));
      app.save(collection);
    } catch (e) {
      // ignore
    }
  }
});
