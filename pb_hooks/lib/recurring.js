// Recurring invoice generation, shared by pb_hooks/recurring.pb.js (PocketBase
// JSVM, via require) and src/lib/recurring.test.ts (vitest). Plain ES5-ish
// CommonJS on purpose: the JSVM has no ES modules.
//
// An invoice with `recurrence` set is a template. Whenever its
// `next_issue_date` is on or before today, a Draft copy is created with that
// issue date (same line items, tax, notes and payment window), and
// `next_issue_date` moves forward one period. Missed periods (server was
// down) are caught up, at most MAX_CATCH_UP per template per run.

var MAX_CATCH_UP = 12;
var INTERVALS = { weekly: 1, monthly: 1, quarterly: 3, yearly: 12 };

function parseYmd(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
    if (!m) return null;
    return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

function pad(n, w) {
    var s = String(n);
    while (s.length < w) s = '0' + s;
    return s;
}

function toStored(p) {
    return pad(p.y, 4) + '-' + pad(p.m, 2) + '-' + pad(p.d, 2) + ' 00:00:00.000Z';
}

function daysInMonth(y, m) {
    return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function dayNumber(p) {
    return Math.round(Date.UTC(p.y, p.m - 1, p.d) / 86400000);
}

function fromDayNumber(n) {
    var d = new Date(n * 86400000);
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
}

// Next date one period after `stored`. `anchorDay` keeps month-based
// schedules on the intended day (the 31st becomes the 30th/28th in short
// months and returns to the 31st afterwards).
function addInterval(stored, recurrence, anchorDay) {
    var p = parseYmd(stored);
    if (!p || !INTERVALS[recurrence]) return '';
    if (recurrence === 'weekly') return toStored(fromDayNumber(dayNumber(p) + 7));
    var months = INTERVALS[recurrence];
    var total = p.y * 12 + (p.m - 1) + months;
    var y = Math.floor(total / 12);
    var m = (total % 12) + 1;
    var want = anchorDay || p.d;
    return toStored({ y: y, m: m, d: Math.min(want, daysInMonth(y, m)) });
}

function addDays(stored, days) {
    var p = parseYmd(stored);
    if (!p) return '';
    return toStored(fromDayNumber(dayNumber(p) + days));
}

function daysBetween(a, b) {
    var pa = parseYmd(a), pb = parseYmd(b);
    if (!pa || !pb) return 0;
    return dayNumber(pb) - dayNumber(pa);
}

// Same numbering scheme as src/lib/invoice.ts nextInvoiceNumber.
function nextInvoiceNumber(existing, prefix, year) {
    var head = (prefix || '') + year + '-';
    var max = 0;
    var taken = {};
    for (var i = 0; i < existing.length; i++) {
        var num = existing[i];
        taken[num] = true;
        if (!num || num.indexOf(head) !== 0) continue;
        var seq = parseInt(num.slice(head.length), 10);
        if (isFinite(seq) && seq > max) max = seq;
    }
    var seqNext = max + 1;
    var candidate;
    do {
        candidate = head + pad(seqNext, 3);
        seqNext++;
    } while (taken[candidate]);
    return candidate;
}

// Pure planning step: which issue dates are due for a template, and what its
// next_issue_date becomes. `today` is a stored-format date string.
function planOccurrences(template, today) {
    var dates = [];
    var next = template.next_issue_date;
    var anchor = (parseYmd(template.next_issue_date) || {}).d;
    var anchorFromIssue = (parseYmd(template.issue_date) || {}).d;
    if (anchorFromIssue) anchor = anchorFromIssue;
    var guard = 0;
    while (next && daysBetween(next, today) >= 0 && guard < MAX_CATCH_UP) {
        dates.push(next);
        next = addInterval(next, template.recurrence, anchor);
        guard++;
    }
    return { dates: dates, next: next };
}

function todayStored(now) {
    var d = now || new Date();
    return toStored({ y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() });
}

// Runs inside PocketBase. `app` is $app. Returns the number of invoices created.
function run(app, now) {
    var today = todayStored(now);
    var templates = app.findRecordsByFilter(
        'invoices',
        "recurrence != '' && next_issue_date != '' && next_issue_date <= {:today}",
        'next_issue_date',
        500,
        0,
        { today: today }
    );
    var invoicesCol = app.findCollectionByNameOrId('invoices');
    var created = 0;

    for (var i = 0; i < templates.length; i++) {
        var tpl = templates[i];
        var user = tpl.getString('user');
        var plan = planOccurrences({
            recurrence: tpl.getString('recurrence'),
            next_issue_date: tpl.getString('next_issue_date'),
            issue_date: tpl.getString('issue_date'),
        }, today);
        if (plan.dates.length === 0) continue;

        var prefix = '';
        try {
            var profile = app.findFirstRecordByFilter('business_profiles', 'user = {:u}', { u: user });
            prefix = profile.getString('invoice_prefix');
        } catch (_) { /* no profile */ }

        var termDays = Math.max(0, daysBetween(tpl.getString('issue_date'), tpl.getString('due_date')));
        var clientName = '';
        try {
            clientName = app.findRecordById('contacts', tpl.getString('client_id')).getString('name');
        } catch (_) { /* deleted client */ }

        for (var j = 0; j < plan.dates.length; j++) {
            var issue = plan.dates[j];
            var year = Number(issue.slice(0, 4));
            var existing = app.findRecordsByFilter('invoices', 'user = {:u}', '', 0, 0, { u: user })
                .map(function (r) { return r.getString('invoice_number'); });
            var number = nextInvoiceNumber(existing, prefix, year);

            var rec = new Record(invoicesCol);
            rec.set('user', user);
            rec.set('invoice_number', number);
            rec.set('client_id', tpl.getString('client_id'));
            rec.set('issue_date', issue);
            rec.set('due_date', addDays(issue, termDays));
            rec.set('line_items', tpl.get('line_items'));
            rec.set('tax_rate', tpl.getFloat('tax_rate'));
            rec.set('notes', tpl.getString('notes'));
            rec.set('status', 'Draft');
            app.save(rec);
            created++;

            try {
                var activity = new Record(app.findCollectionByNameOrId('recent_activity'));
                activity.set('user', user);
                activity.set('type', 'INVOICE_CREATED');
                activity.set('timestamp', new Date().toISOString());
                activity.set('description', 'Recurring invoice ' + number + ' created' + (clientName ? ' for ' + clientName : '') + ' (from ' + tpl.getString('invoice_number') + ')');
                app.save(activity);
            } catch (_) { /* activity is best-effort */ }
        }

        tpl.set('next_issue_date', plan.next);
        app.save(tpl);
    }
    return created;
}

module.exports = {
    addInterval: addInterval,
    addDays: addDays,
    daysBetween: daysBetween,
    nextInvoiceNumber: nextInvoiceNumber,
    planOccurrences: planOccurrences,
    todayStored: todayStored,
    run: run,
};
