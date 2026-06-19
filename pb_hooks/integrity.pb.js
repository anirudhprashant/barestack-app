/// <reference path="../pb_data/types.d.ts" />

// Server-side integrity guards for the audit-log-style collections.
//
// Background (see SECURITY_AUDIT.md F1): recent_activity and import_batches are
// written by the user's own authenticated token from the browser, alongside the
// business action the entry describes. There is no separate trusted server
// process in this architecture, so an authenticated user can always manufacture
// a syntactically-valid activity row. We cannot move these writes behind an
// owner-only rule without breaking the ~15 addRecentActivity call sites.
//
// What these hooks DO enforce (defense-in-depth, server-checked, cannot be
// bypassed by a console attacker):
//   - recent_activity.type        must be one of the verified enum values
//   - recent_activity.timestamp   must be a valid date and not in the future;
//                                if missing, the server stamps now() so a
//                                client cannot backdate into arbitrary times,
//                                while the app's real `new Date()` payloads pass
//   - recent_activity.description capped to the verified 2000 chars
//   - import_batches.contact_count must be a non-negative integer
//   - import_batches.file_name     capped to the verified 500 chars
//
// What these hooks DO NOT do (the complete F1 fix, left for a redesign): they do
// not transactionally tie an activity entry to a real mutation. That would
// require re-architecting the app's "do action, then log it" two-request pattern
// across ~15 call sites and risks breaking the live app, so it is out of scope
// for this hardening pass. These guards shrink the forge surface to "a
// plausible, non-future-dated, well-formed entry" rather than "anything at all".
//
// API note: targets the PocketBase 0.22+ JSVM. The `*Request` hooks
// (onRecordCreateRequest / onRecordUpdateRequest) replaced the older
// `onRecordBefore*Request` names (which silently never fire on 0.22+). Per the
// 0.27 refactor, record API rules are checked BEFORE these hooks fire, so
// owner/verification isolation still applies first. Throw to abort (-> 400);
// call e.next() to proceed.
//
// JSVM gotchas, both verified empirically against the pinned PocketBase 0.36.2:
//   1. Each hook callback runs in its own scope and does NOT see top-level
//      function/const declarations from this file (a referenced helper throws
//      "ReferenceError: ... is not defined"). So all logic is INLINED per
//      handler — the duplication is required for the hooks to fire at all.
//   2. record.get("timestamp") on a `date` field returns a DateTime OBJECT
//      (always truthy, breaks `!ts` and `new Date(ts)`). Use the typed
//      record.getString(key) so empty dates read back as "" and we compare
//      plain strings.

onRecordCreateRequest(function (e) {
    // --- recent_activity guard (inlined) ---
    var rec = e.record;
    var t = rec.getString("type");
    var TYPES = ["CONTACT_ADDED", "PROJECT_CREATED", "INVOICE_CREATED", "INVOICE_SENT", "TASK_COMPLETED", "DEAL_ADDED", "EXPENSE_ADDED"];
    if (TYPES.indexOf(t) === -1) {
        throw new Error("Invalid activity type");
    }
    var ts = rec.getString("timestamp");
    if (!ts) {
        // No timestamp supplied: stamp the server clock and skip the future check
        // (it is "now" by construction).
        rec.set("timestamp", new Date().toISOString());
    } else {
        var ms = new Date(ts).getTime();
        if (isNaN(ms)) {
            throw new Error("Invalid activity timestamp");
        }
        if (ms > new Date().getTime() + 1000) {
            throw new Error("Activity timestamp cannot be in the future");
        }
    }
    var desc = rec.getString("description");
    if (desc.length > 2000) {
        rec.set("description", desc.slice(0, 2000));
    }
    e.next();
}, "recent_activity");

onRecordUpdateRequest(function (e) {
    var rec = e.record;
    var t = rec.getString("type");
    var TYPES = ["CONTACT_ADDED", "PROJECT_CREATED", "INVOICE_CREATED", "INVOICE_SENT", "TASK_COMPLETED", "DEAL_ADDED", "EXPENSE_ADDED"];
    if (TYPES.indexOf(t) === -1) {
        throw new Error("Invalid activity type");
    }
    var ts = rec.getString("timestamp");
    if (!ts) {
        rec.set("timestamp", new Date().toISOString());
    } else {
        var ms = new Date(ts).getTime();
        if (isNaN(ms)) {
            throw new Error("Invalid activity timestamp");
        }
        if (ms > new Date().getTime() + 1000) {
            throw new Error("Activity timestamp cannot be in the future");
        }
    }
    var desc = rec.getString("description");
    if (desc.length > 2000) {
        rec.set("description", desc.slice(0, 2000));
    }
    e.next();
}, "recent_activity");

onRecordCreateRequest(function (e) {
    // --- import_batches guard (inlined) ---
    var rec = e.record;
    var cc = rec.get("contact_count");
    if (cc !== null && cc !== undefined && cc !== "") {
        var n = Number(cc);
        if (!Number.isInteger(n) || n < 0) {
            throw new Error("Invalid contact_count");
        }
    }
    var fn = rec.getString("file_name");
    if (fn.length > 500) {
        rec.set("file_name", fn.slice(0, 500));
    }
    e.next();
}, "import_batches");

onRecordUpdateRequest(function (e) {
    var rec = e.record;
    var cc = rec.get("contact_count");
    if (cc !== null && cc !== undefined && cc !== "") {
        var n = Number(cc);
        if (!Number.isInteger(n) || n < 0) {
            throw new Error("Invalid contact_count");
        }
    }
    var fn = rec.getString("file_name");
    if (fn.length > 500) {
        rec.set("file_name", fn.slice(0, 500));
    }
    e.next();
}, "import_batches");