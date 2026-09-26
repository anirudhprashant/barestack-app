/// <reference path="../pb_data/types.d.ts" />

// Self-host friendly email verification.
//
// Data access requires a verified account (see
// pb_migrations/1780500000_require_verified_for_data.js). That only works when
// PocketBase can actually send the verification email. A fresh self-hosted
// install has SMTP disabled, so new users would sit on the "Verify your email"
// screen forever with no way forward.
//
// When SMTP is NOT configured, new sign-ups are marked verified on creation.
// As soon as an admin enables SMTP in the PocketBase dashboard
// (Settings -> Mail settings), normal email verification applies again.
//
// Set BARESTACK_REQUIRE_EMAIL_VERIFICATION=true in PocketBase's environment
// to always require verification, even without SMTP.
//
// Same JSVM caveat as integrity.pb.js: the callback cannot see top-level
// helpers from this file, so the logic is inlined.
// Runs after the record is committed: the create request itself refuses a
// client-side `verified` change, so the flag is flipped with a plain model
// save instead. The app signs the user in right after sign-up, and that
// auth response carries the updated flag.
onRecordAfterCreateSuccess(function (e) {
    var forced = String($os.getenv("BARESTACK_REQUIRE_EMAIL_VERIFICATION") || "").toLowerCase();
    var mustVerify = forced === "1" || forced === "true" || forced === "yes";
    if (!mustVerify && !e.app.settings().smtp.enabled && !e.record.getBool("verified")) {
        e.record.set("verified", true);
        e.app.save(e.record);
    }
    e.next();
}, "users");
