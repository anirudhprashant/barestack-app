import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { differenceInCalendarDays } from 'date-fns';
import type { BusinessProfile, Contact, Invoice, UserProfile } from '../../types';
import { invoiceSubtotal, invoiceTax, invoiceTotal, lineItemAmount, effectiveStatus } from './invoice';
import { parseDateOnly } from './dates';
import { DEFAULT_CURRENCY } from './format';

// Instrument Serif isn't one of jsPDF's three built-in fonts, so embed the real
// brand font (lazily, as its own chunk) and register it on each document.
let fontPromise: Promise<{ regular: string; italic: string }> | null = null;
const loadBrandFont = () => {
    if (!fontPromise) {
        fontPromise = import('./instrumentSerifFont').then(m => ({
            regular: m.instrumentSerifRegular,
            italic: m.instrumentSerifItalic,
        }));
    }
    return fontPromise;
};

// jsPDF's built-in Helvetica only covers WinAnsi (Latin-1 plus a few extras
// like €). Anything else (₹, ₩, ₱ ...) prints as garbage, so fall back to the
// ISO code for those currencies, and swap the narrow/no-break spaces some
// locales use as group separators for plain spaces.
const WIN_ANSI_EXTRAS = new Set(['€', '‚', 'ƒ', '„', '…', '†', '‡', 'ˆ', '‰', 'Š', '‹', 'Œ', 'Ž', '‘', '’', '“', '”', '•', '–', '—', '˜', '™', 'š', '›', 'œ', 'ž', 'Ÿ']);
function pdfSafe(s: string): boolean {
    for (const ch of s) {
        const code = ch.codePointAt(0)!;
        if (code > 255 && !WIN_ANSI_EXTRAS.has(ch)) return false;
    }
    return true;
}

export function pdfMoney(n: number, currency: string): string {
    const opts: Intl.NumberFormatOptions = { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 };
    let out: string;
    try {
        out = new Intl.NumberFormat('en-US', opts).format(n);
        if (!pdfSafe(out)) out = new Intl.NumberFormat('en-US', { ...opts, currencyDisplay: 'code' }).format(n);
    } catch {
        out = new Intl.NumberFormat('en-US', { ...opts, currency: DEFAULT_CURRENCY }).format(n);
    }
    return out.replace(/[  ]/g, ' ');
}

// Strip characters Helvetica can't draw so a stray emoji doesn't corrupt the line.
function clean(s: string | undefined | null): string {
    if (!s) return '';
    let out = '';
    for (const ch of s) out += pdfSafe(ch) ? ch : '?';
    return out;
}

export interface InvoicePdfInput {
    invoice: Invoice;
    client?: Contact;
    business: BusinessProfile;
    user: UserProfile;
}

export async function generateInvoicePdf({ invoice, client, business, user }: InvoicePdfInput): Promise<jsPDF> {
    const doc = new jsPDF();
    const currency = business.currency || DEFAULT_CURRENCY;
    const money = (n: number) => pdfMoney(n, currency);

    const font = await loadBrandFont();
    doc.addFileToVFS('InstrumentSerif-Regular.ttf', font.regular);
    doc.addFont('InstrumentSerif-Regular.ttf', 'InstrumentSerif', 'normal');
    doc.addFileToVFS('InstrumentSerif-Italic.ttf', font.italic);
    doc.addFont('InstrumentSerif-Italic.ttf', 'InstrumentSerif', 'italic');
    const serif = 'InstrumentSerif';

    const clientName = clean(client?.name) || 'Unknown Client';
    const issuerName = clean(business.business_name) || clean(user.name) || 'BareStackOS';
    const status = effectiveStatus(invoice);
    const subtotal = invoiceSubtotal(invoice);
    const taxAmount = invoiceTax(invoice);
    const total = invoiceTotal(invoice);

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 18;
    const rightMargin = pageWidth - margin;

    // BareStack design-system palette (RGB)
    const canvas: [number, number, number] = [250, 249, 245];
    const surface: [number, number, number] = [244, 242, 238];
    const content: [number, number, number] = [20, 28, 17];
    const forest: [number, number, number] = [25, 33, 24];
    const accent: [number, number, number] = [195, 118, 36];
    const gold: [number, number, number] = [232, 184, 109];
    const mutedC: [number, number, number] = [107, 107, 107];
    const border: [number, number, number] = [212, 209, 201];

    const fmtDate = (value: string | undefined) => {
        const d = parseDateOnly(value);
        return d ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
    };

    doc.setProperties({
        title: `Invoice ${invoice.invoice_number}`,
        subject: `Invoice for ${clientName}`,
        author: issuerName,
        creator: 'BareStackOS',
    });

    const paintBackground = () => {
        doc.setFillColor(...canvas);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
    };
    paintBackground();

    // ── Forest-green header band ───────────────────────────────
    const bandH = 46;
    doc.setFillColor(...forest);
    doc.rect(0, 0, pageWidth, bandH, 'F');
    doc.setFillColor(...gold);
    doc.rect(0, bandH - 1.2, pageWidth, 1.2, 'F');

    // Issuer name in the band. Without a business name, keep the BareStackOS
    // wordmark the app has always printed.
    doc.setFontSize(26);
    doc.setTextColor(...canvas);
    if (business.business_name) {
        doc.setFont(serif, 'normal');
        const nameLines = doc.splitTextToSize(issuerName, 110) as string[];
        doc.text(nameLines[0], margin, 26);
    } else {
        doc.setFont(serif, 'normal');
        doc.text('BareStack', margin, 26);
        const brandWidth = doc.getTextWidth('BareStack');
        doc.setFont(serif, 'italic');
        doc.text('OS', margin + brandWidth, 26);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...gold);
    const tagline = clean(business.website) || (business.business_name ? '' : 'CRM FOR AGENCIES + FREELANCERS');
    if (tagline) doc.text(tagline.toUpperCase(), margin, 33, { charSpace: 0.6 });

    doc.setFont(serif, 'normal');
    doc.setFontSize(20);
    doc.setTextColor(...canvas);
    doc.text('INVOICE', rightMargin, 24, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...gold);
    doc.text(`#${clean(invoice.invoice_number)}`, rightMargin, 33, { align: 'right' });

    // ── Meta block ─────────────────────────────────────────────
    const label = (text: string, x: number, y: number) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...mutedC);
        doc.text(text, x, y, { charSpace: 0.6 });
    };
    const small = (lines: string[], x: number, y: number, maxWidth: number): number => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...mutedC);
        for (const raw of lines) {
            for (const line of doc.splitTextToSize(raw, maxWidth) as string[]) {
                doc.text(line, x, y);
                y += 4.2;
            }
        }
        return y;
    };

    const leftWidth = 100;
    let ly = 60;
    label('FROM', margin, ly);
    ly += 6;
    doc.setFont(serif, 'normal');
    doc.setFontSize(12);
    doc.setTextColor(...content);
    doc.text(issuerName, margin, ly);
    ly += 5;
    const fromLines = [
        ...clean(business.address).split('\n').map(l => l.trim()).filter(Boolean),
        clean(business.email) || clean(user.email),
        clean(business.phone),
        business.tax_id ? `Tax ID: ${clean(business.tax_id)}` : '',
    ].filter(Boolean);
    ly = small(fromLines, margin, ly, leftWidth);

    ly += 5;
    label('BILLED TO', margin, ly);
    ly += 6;
    doc.setFont(serif, 'normal');
    doc.setFontSize(12);
    doc.setTextColor(...content);
    doc.text(clientName, margin, ly);
    ly += 5;
    ly = small([clean(client?.company), clean(client?.email), clean(client?.phone)].filter(Boolean), margin, ly, leftWidth);

    // Right: invoice details
    const detailLabelX = 128;
    const detailRow = (y: number, text: string, value: string) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...mutedC);
        doc.text(text, detailLabelX, y, { charSpace: 0.4 });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(...content);
        doc.text(value, rightMargin, y, { align: 'right' });
    };
    detailRow(60, 'ISSUE DATE', fmtDate(invoice.issue_date));
    detailRow(67, 'DUE DATE', fmtDate(invoice.due_date));
    let ry = 74;
    if (status === 'Paid' && invoice.paid_date) {
        detailRow(74, 'PAID ON', fmtDate(invoice.paid_date));
        ry = 81;
    }
    detailRow(ry, 'AMOUNT DUE', money(status === 'Paid' ? 0 : total));
    ry += 7;

    // Status pill (right-aligned)
    const statusStyles: Record<string, { bg: [number, number, number]; fg: [number, number, number] }> = {
        Paid: { bg: forest, fg: canvas },
        Sent: { bg: accent, fg: canvas },
        Overdue: { bg: [183, 28, 28], fg: canvas },
        Draft: { bg: surface, fg: content },
    };
    const st = statusStyles[status] || { bg: surface, fg: content };
    const statusLabel = String(status).toUpperCase();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const pillCharSpace = 0.4;
    const runW = doc.getTextWidth(statusLabel) + pillCharSpace * (statusLabel.length - 1);
    const pillPadX = 5;
    const pillW = runW + pillPadX * 2;
    const pillH = 7;
    const pillY = ry;
    const pillX = rightMargin - pillW;
    doc.setFillColor(...st.bg);
    doc.rect(pillX, pillY, pillW, pillH, 'F');
    if (status === 'Draft') {
        doc.setDrawColor(...border);
        doc.setLineWidth(0.3);
        doc.rect(pillX, pillY, pillW, pillH, 'S');
    }
    doc.setTextColor(...st.fg);
    doc.text(statusLabel, pillX + pillPadX, pillY + pillH / 2, { charSpace: pillCharSpace, baseline: 'middle' });

    const dividerY = Math.max(100, ly + 4, pillY + pillH + 8);
    doc.setDrawColor(...border);
    doc.setLineWidth(0.4);
    doc.line(margin, dividerY, rightMargin, dividerY);

    // ── Line items table ───────────────────────────────────────
    const tableData = invoice.line_items.map(item => [
        clean(item.description),
        String(item.quantity),
        money(item.rate),
        money(lineItemAmount(item)),
    ]);

    autoTable(doc, {
        startY: dividerY + 6,
        head: [['DESCRIPTION', 'QTY', 'RATE', 'AMOUNT']],
        body: tableData,
        theme: 'plain',
        headStyles: {
            fillColor: forest,
            textColor: canvas,
            fontStyle: 'bold',
            fontSize: 8,
            cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
        },
        bodyStyles: {
            fontSize: 9.5,
            cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
            textColor: content,
            lineColor: border,
            lineWidth: { bottom: 0.2 },
        },
        alternateRowStyles: { fillColor: surface },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { halign: 'center', cellWidth: 20 },
            2: { halign: 'right', cellWidth: 34 },
            3: { halign: 'right', cellWidth: 36 },
        },
        margin: { left: margin, right: margin, bottom: 34 },
        // columnStyles only align body cells; match the header to its column.
        didParseCell: (hookData) => {
            if (hookData.section === 'head' && hookData.column.index > 0) {
                hookData.cell.styles.halign = hookData.column.index === 1 ? 'center' : 'right';
            }
        },
        willDrawPage: (hookData) => {
            if (hookData.pageNumber > 1) paintBackground();
        },
    });

    // ── Totals ─────────────────────────────────────────────────
    let ty = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 150) + 10;
    const ensureSpace = (needed: number) => {
        if (ty + needed > pageHeight - 34) {
            doc.addPage();
            paintBackground();
            ty = 24;
        }
    };
    ensureSpace(30);

    const labelX = 118;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...mutedC);
    doc.text('Subtotal', labelX + 4, ty);
    doc.setTextColor(...content);
    doc.text(money(subtotal), rightMargin, ty, { align: 'right' });

    if (invoice.tax_rate > 0) {
        ty += 7;
        doc.setTextColor(...mutedC);
        doc.text(`Tax (${invoice.tax_rate}%)`, labelX + 4, ty);
        doc.setTextColor(...content);
        doc.text(money(taxAmount), rightMargin, ty, { align: 'right' });
    }

    const barTop = ty + 4;
    doc.setFillColor(...forest);
    doc.rect(labelX, barTop, rightMargin - labelX, 12, 'F');
    doc.setFont(serif, 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...canvas);
    doc.text(status === 'Paid' ? 'TOTAL PAID' : 'TOTAL DUE', labelX + 4, barTop + 8, { charSpace: 0.4 });
    doc.setFontSize(13);
    doc.text(money(total), rightMargin - 4, barTop + 8, { align: 'right' });
    ty = barTop + 22;

    // ── Notes + payment instructions ───────────────────────────
    const block = (title: string, body: string) => {
        const lines = doc.splitTextToSize(clean(body), rightMargin - margin) as string[];
        ensureSpace(10 + lines.length * 4.4);
        label(title, margin, ty);
        ty += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...content);
        for (const line of lines) {
            doc.text(line, margin, ty);
            ty += 4.4;
        }
        ty += 5;
    };
    if (invoice.notes?.trim()) block('NOTES', invoice.notes.trim());
    if (business.payment_instructions?.trim() && status !== 'Paid') block('HOW TO PAY', business.payment_instructions.trim());

    // ── Footer (every page) ────────────────────────────────────
    const issue = parseDateOnly(invoice.issue_date);
    const due = parseDateOnly(invoice.due_date);
    const days = issue && due ? differenceInCalendarDays(due, issue) : null;
    const terms = status === 'Paid'
        ? 'Paid in full'
        : days === null ? '' : days <= 0 ? 'Payment due on receipt' : `Payment due within ${days} day${days === 1 ? '' : 's'}`;
    const footerRight = [terms, 'Generated with BareStackOS'].filter(Boolean).join('   ·   ');
    const thanks = clean(business.invoice_footer) || 'Thank you for your business.';

    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
        doc.setPage(p);
        const fy = pageHeight - 24;
        doc.setDrawColor(...border);
        doc.setLineWidth(0.3);
        doc.line(margin, fy, rightMargin, fy);
        doc.setFillColor(...accent);
        doc.rect(margin, fy - 0.4, 20, 0.9, 'F');

        doc.setFont(serif, 'italic');
        doc.setFontSize(11);
        doc.setTextColor(...content);
        doc.text((doc.splitTextToSize(thanks, 90) as string[])[0], margin, fy + 9);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...mutedC);
        doc.text(pages > 1 ? `${footerRight}   ·   Page ${p} of ${pages}` : footerRight, rightMargin, fy + 9, { align: 'right' });
    }

    return doc;
}

export function invoiceFileName(invoice: Invoice, client?: Contact): string {
    const safe = (s: string) => s.replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '');
    return `Invoice_${safe(invoice.invoice_number) || 'draft'}_${safe(client?.name || 'client') || 'client'}.pdf`;
}
