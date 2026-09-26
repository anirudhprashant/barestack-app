/// <reference path="../pb_data/types.d.ts" />

// Recurring invoices: every hour, create Draft copies of any recurring invoice
// whose next issue date has arrived. The logic lives in lib/recurring.js
// (required inside the callback, because JSVM callbacks can't see top-level
// declarations from this file). A superuser can also trigger it on demand
// from the PocketBase dashboard's Crons page.
cronAdd("barestack_recurring_invoices", "7 * * * *", function () {
    var recurring = require(__hooks + "/lib/recurring.js");
    try {
        var n = recurring.run($app, new Date());
        if (n > 0) console.log("[barestack] created " + n + " recurring invoice(s)");
    } catch (err) {
        console.log("[barestack] recurring invoices failed: " + err);
    }
});
