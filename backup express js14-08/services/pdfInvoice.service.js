const COMPANY_NAME =
  process.env.INVOICE_COMPANY_NAME || "ChristophTec Solutions Private Limited";
const BRAND_NAME = process.env.INVOICE_BRAND_NAME || "Bhavishya Katha";
const COMPANY_GSTIN = process.env.INVOICE_COMPANY_GSTIN || "19AALCC7732P1ZU";
const COMPANY_ADDRESS =
  process.env.INVOICE_COMPANY_ADDRESS || "Ranaghat, Nadia , PIN-741201";

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

const escapePdfText = (value) =>
  String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

const padInvoiceNumber = (value) => String(value).padStart(6, "0");

const formatCurrency = (value) => `INR ${Number(value || 0).toFixed(2)}`;

const formatDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value ?? "");
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

// ---------------------------------------------------------------------------
// Low-level PDF primitives
// ---------------------------------------------------------------------------

/** Render a text string at (x, y) */
const textLine = (text, x, y, font = "F1", size = 11) =>
  `BT /${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${escapePdfText(text)}) Tj ET`;

/** Filled rectangle  — r/g/b each 0-1 */
const filledRect = (x, y, w, h, r = 0, g = 0, b = 0) =>
  `${r} ${g} ${b} rg ${x} ${y} ${w} ${h} re f`;

/** Stroked rectangle (border only) — r/g/b each 0-1, lw = line width */
const strokedRect = (x, y, w, h, r = 0, g = 0, b = 0, lw = 0.5) =>
  `${lw} w ${r} ${g} ${b} RG ${x} ${y} ${w} ${h} re S`;

/** Horizontal line */
const hLine = (x1, y, x2, r = 0.8, g = 0.8, b = 0.8, lw = 0.5) =>
  `${lw} w ${r} ${g} ${b} RG ${x1} ${y} m ${x2} ${y} l S`;

/** Vertical line */
const vLine = (x, y1, y2, r = 0.8, g = 0.8, b = 0.8, lw = 0.5) =>
  `${lw} w ${r} ${g} ${b} RG ${x} ${y1} m ${x} ${y2} l S`;

/** Right-aligned text — x is the right edge */
const textRight = (text, rightX, y, font = "F1", size = 11, charsPerUnit = 0.6) => {
  const approxWidth = String(text).length * size * charsPerUnit;
  return textLine(text, rightX - approxWidth, y, font, size);
};

// ---------------------------------------------------------------------------
// PDF assembler (unchanged from original)
// ---------------------------------------------------------------------------

const buildPdf = (lines) => {
  const objects = [];

  const addObject = (content) => {
    objects.push(content);
    return objects.length;
  };

  const contentStream = lines.join("\n");
  const contentObjectId = addObject(
    `<< /Length ${Buffer.byteLength(contentStream, "utf8")} >>\nstream\n${contentStream}\nendstream`
  );
  const fontObjectId = addObject(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
  );
  const boldFontObjectId = addObject(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"
  );
  const pageObjectId = addObject(
    `<< /Type /Page /Parent 5 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObjectId} 0 R /F2 ${boldFontObjectId} 0 R >> >> /Contents ${contentObjectId} 0 R >>`
  );
  const pagesObjectId = addObject(
    `<< /Type /Pages /Kids [${pageObjectId} 0 R] /Count 1 >>`
  );
  const catalogObjectId = addObject(
    `<< /Type /Catalog /Pages ${pagesObjectId} 0 R >>`
  );

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((objectContent, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${objectContent}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogObjectId} 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
};

// ---------------------------------------------------------------------------
// Invoice builder
// ---------------------------------------------------------------------------

export const buildWalletRechargeInvoice = ({
  invoiceNumber,
  rechargeLogId,
  createdAt,
  customerName,
  customerGstin,
  rechargeAmount,
  gstAmount,
  payableAmount,
  couponCode,
  couponBonusAmount,
  creditedAmount,
  razorpayPaymentId,
  razorpayOrderId,
}) => {
  // --- computed values ---
  const taxableAmount  = Number(rechargeAmount || 0);
  const totalGst       = Number(gstAmount || 0);
  const cgstAmount     = Number((totalGst / 2).toFixed(2));
  const sgstAmount     = Number((totalGst - cgstAmount).toFixed(2));
  const totalAmount    = Number(payableAmount || taxableAmount + totalGst);
  const bonusAmount    = Number(couponBonusAmount || 0);
  const totalWalletCredit = Number(creditedAmount || taxableAmount + bonusAmount);

  // --- page geometry ---
  const PAGE_W = 595;
  const L = 36;          // left margin
  const R = PAGE_W - 36; // right margin  (559)
  const MID = PAGE_W / 2;
  const lines = [];

  // =========================================================================
  // HEADER BAND  (dark navy background, white text)
  // =========================================================================
  const HEADER_TOP    = 842;
  const HEADER_BOTTOM = 700;
  const HEADER_H      = HEADER_TOP - HEADER_BOTTOM;

  // dark navy fill  #1a1a2e ? 0.10 / 0.10 / 0.18
  lines.push(filledRect(0, HEADER_BOTTOM, PAGE_W, HEADER_H, 0.10, 0.10, 0.18));

  // brand name  (white, bold, 20)
  lines.push(`BT /F2 20 Tf 1 1 1 rg 1 0 0 1 ${L} 798 Tm (${escapePdfText(BRAND_NAME)}) Tj ET`);
  // company sub-name (light grey, 10)
  lines.push(`BT /F1 10 Tf 0.67 0.67 0.80 rg 1 0 0 1 ${L} 782 Tm (${escapePdfText(COMPANY_NAME)}) Tj ET`);

  // "TAX INVOICE" label top-right (muted, 8, tracking simulated by spaces)
  lines.push(`BT /F1 8 Tf 0.53 0.53 0.67 rg 1 0 0 1 390 820 Tm (TAX INVOICE) Tj ET`);

  // invoice number box  (subtle border, monospaced look)
  lines.push(strokedRect(388, 790, 171, 22, 1, 1, 1, 0.4));
  lines.push(`BT /F1 9 Tf 0.53 0.53 0.67 rg 1 0 0 1 393 806 Tm (Invoice No.) Tj ET`);
  lines.push(`BT /F2 10 Tf 0.91 0.91 1.00 rg 1 0 0 1 393 795 Tm (${escapePdfText(invoiceNumber)}) Tj ET`);

  // invoice date (muted, right-aligned area)
  lines.push(`BT /F1 9 Tf 0.53 0.53 0.67 rg 1 0 0 1 390 778 Tm (${escapePdfText(formatDate(createdAt))}) Tj ET`);

  // GSTIN & address below brand (muted)
  lines.push(`BT /F1 9 Tf 0.53 0.53 0.67 rg 1 0 0 1 ${L} 762 Tm (GSTIN: ${escapePdfText(COMPANY_GSTIN)}) Tj ET`);
  lines.push(`BT /F1 9 Tf 0.53 0.53 0.67 rg 1 0 0 1 ${L} 750 Tm (${escapePdfText(COMPANY_ADDRESS)}) Tj ET`);

  // =========================================================================
  // FROM / BILL TO  two-column band
  // =========================================================================
  const BILLING_TOP    = HEADER_BOTTOM;       // 700
  const BILLING_BOTTOM = 630;
  const BILLING_H      = BILLING_TOP - BILLING_BOTTOM;

  // light grey background for billing band
  lines.push(filledRect(0, BILLING_BOTTOM, PAGE_W, BILLING_H, 0.96, 0.96, 0.96));
  // divider between FROM and BILL TO
  lines.push(vLine(MID, BILLING_BOTTOM, BILLING_TOP, 0.8, 0.8, 0.8, 0.5));
  // bottom border
  lines.push(hLine(0, BILLING_BOTTOM, PAGE_W, 0.8, 0.8, 0.8, 0.5));

  // FROM column
  lines.push(`BT /F1 8 Tf 0.55 0.55 0.55 rg 1 0 0 1 ${L} 690 Tm (FROM) Tj ET`);
  lines.push(`BT /F2 10 Tf 0.13 0.13 0.13 rg 1 0 0 1 ${L} 676 Tm (${escapePdfText(COMPANY_NAME)}) Tj ET`);
  lines.push(`BT /F1 9 Tf 0.40 0.40 0.40 rg 1 0 0 1 ${L} 663 Tm (${escapePdfText(COMPANY_ADDRESS)}) Tj ET`);
  lines.push(`BT /F1 9 Tf 0.55 0.55 0.55 rg 1 0 0 1 ${L} 650 Tm (GSTIN: ${escapePdfText(COMPANY_GSTIN)}) Tj ET`);

  // BILL TO column
  const BL = MID + 12;
  lines.push(`BT /F1 8 Tf 0.55 0.55 0.55 rg 1 0 0 1 ${BL} 690 Tm (BILL TO) Tj ET`);
  lines.push(`BT /F2 10 Tf 0.13 0.13 0.13 rg 1 0 0 1 ${BL} 676 Tm (${escapePdfText(customerName || "Customer")}) Tj ET`);
  lines.push(`BT /F1 9 Tf 0.40 0.40 0.40 rg 1 0 0 1 ${BL} 663 Tm (Customer) Tj ET`);
  lines.push(`BT /F1 9 Tf 0.55 0.55 0.55 rg 1 0 0 1 ${BL} 650 Tm (GSTIN: ${escapePdfText(customerGstin || "Not Provided")}) Tj ET`);

  // =========================================================================
  // LINE ITEMS TABLE
  // =========================================================================
  const TABLE_TOP = BILLING_BOTTOM;   // 630
  const TABLE_BOT = 565;

  // table header bg  (very light grey)
  lines.push(filledRect(L, TABLE_TOP - 20, R - L, 20, 0.93, 0.93, 0.93));

  // column headers
  lines.push(`BT /F1 8 Tf 0.40 0.40 0.40 rg 1 0 0 1 ${L + 4} ${TABLE_TOP - 14} Tm (DESCRIPTION) Tj ET`);
  // lines.push(`BT /F1 8 Tf 0.40 0.40 0.40 rg 1 0 0 1 350 ${TABLE_TOP - 14} Tm (HSN / SAC) Tj ET`);
  lines.push(textRight("AMOUNT", R - 4, TABLE_TOP - 14, "F1", 8));

  // header bottom border
  lines.push(hLine(L, TABLE_TOP - 20, R, 0.75, 0.75, 0.75, 0.5));

  // item row
  lines.push(`BT /F2 10 Tf 0.13 0.13 0.13 rg 1 0 0 1 ${L + 4} ${TABLE_TOP - 36} Tm (Wallet Recharge) Tj ET`);
  lines.push(`BT /F1 9 Tf 0.50 0.50 0.50 rg 1 0 0 1 ${L + 4} ${TABLE_TOP - 49} Tm (Prepaid digital wallet credit - ${escapePdfText(BRAND_NAME)} platform) Tj ET`);
 // lines.push(`BT /F1 9 Tf 0.55 0.55 0.55 rg 1 0 0 1 352 ${TABLE_TOP - 36} Tm (998431) Tj ET`);
  lines.push(textRight(formatCurrency(taxableAmount), R - 4, TABLE_TOP - 36, "F1", 10));

  // row bottom border
  lines.push(hLine(L, TABLE_BOT, R, 0.80, 0.80, 0.80, 0.5));

  // outer table border
  lines.push(strokedRect(L, TABLE_BOT, R - L, TABLE_TOP - TABLE_BOT, 0.80, 0.80, 0.80, 0.5));

  // =========================================================================
  // TAX BREAKDOWN  (left half) + WALLET CREDIT (right half)
  // =========================================================================
  const SPLIT_TOP = TABLE_BOT;       // 565
  const SPLIT_BOT = bonusAmount > 0 ? 440 : 480;
  const SPLIT_H   = SPLIT_TOP - SPLIT_BOT;

  // light fill
  lines.push(filledRect(L, SPLIT_BOT, R - L, SPLIT_H, 0.97, 0.97, 0.97));
  lines.push(vLine(MID, SPLIT_BOT, SPLIT_TOP, 0.82, 0.82, 0.82, 0.5));
  lines.push(strokedRect(L, SPLIT_BOT, R - L, SPLIT_H, 0.80, 0.80, 0.80, 0.5));

  // --- Tax section label ---
  lines.push(`BT /F1 8 Tf 0.45 0.45 0.45 rg 1 0 0 1 ${L + 6} ${SPLIT_TOP - 14} Tm (TAX BREAKDOWN) Tj ET`);

  let ty = SPLIT_TOP - 30;
  const taxRows = [
    ["Taxable Value",      formatCurrency(taxableAmount)],
    ["CGST @ 9%",         formatCurrency(cgstAmount)],
    ["SGST @ 9%",         formatCurrency(sgstAmount)],
    ["Total GST",         formatCurrency(totalGst)],
  ];

  taxRows.forEach(([label, val], i) => {
    const isBold = i === taxRows.length - 1;
    const font   = isBold ? "F2" : "F1";
    const grey   = isBold ? "0.13 0.13 0.13" : "0.35 0.35 0.35";
    lines.push(`BT /${font} 9 Tf ${grey} rg 1 0 0 1 ${L + 6} ${ty} Tm (${escapePdfText(label)}) Tj ET`);
    lines.push(textRight(val, MID - 8, ty, font, 9));
    ty -= 16;
  });

  // --- Wallet credit section ---
  lines.push(`BT /F1 8 Tf 0.45 0.45 0.45 rg 1 0 0 1 ${MID + 8} ${SPLIT_TOP - 14} Tm (WALLET CREDIT) Tj ET`);

  let wy = SPLIT_TOP - 30;
  lines.push(`BT /F1 9 Tf 0.35 0.35 0.35 rg 1 0 0 1 ${MID + 8} ${wy} Tm (Base Credit) Tj ET`);
  lines.push(textRight(formatCurrency(taxableAmount), R - 6, wy, "F1", 9));
  wy -= 16;

  if (bonusAmount > 0) {
    const couponLabel = `Coupon: ${couponCode || "--"}`;
    lines.push(`BT /F1 9 Tf 0.35 0.35 0.35 rg 1 0 0 1 ${MID + 8} ${wy} Tm (${escapePdfText(couponLabel)}) Tj ET`);
    lines.push(textRight(`+ ${formatCurrency(bonusAmount)}`, R - 6, wy, "F1", 9));
    wy -= 16;
  }

  lines.push(`BT /F2 9 Tf 0.13 0.13 0.13 rg 1 0 0 1 ${MID + 8} ${wy} Tm (Total Credited) Tj ET`);
  lines.push(textRight(formatCurrency(totalWalletCredit), R - 6, wy, "F2", 9));

  // =========================================================================
  // GRAND TOTAL BAND
  // =========================================================================
  const GT_TOP = SPLIT_BOT;
  const GT_BOT = GT_TOP - 46;

  // dark band
  lines.push(filledRect(L, GT_BOT, R - L, 46, 0.10, 0.10, 0.18));

  lines.push(`BT /F1 9 Tf 0.67 0.67 0.80 rg 1 0 0 1 ${L + 8} ${GT_TOP - 14} Tm (GRAND TOTAL PAID) Tj ET`);
  lines.push(`BT /F2 18 Tf 1 1 1 rg 1 0 0 1 ${L + 8} ${GT_BOT + 10} Tm (${escapePdfText(formatCurrency(totalAmount))}) Tj ET`);

  // "PAID" badge on right
  lines.push(filledRect(R - 60, GT_BOT + 10, 54, 22, 0.09, 0.47, 0.29));
  lines.push(`BT /F2 10 Tf 1 1 1 rg 1 0 0 1 ${R - 50} ${GT_BOT + 17} Tm (PAID) Tj ET`);

  // =========================================================================
  // PAYMENT REFERENCE
  // =========================================================================
  const PAY_TOP = GT_BOT;
  const PAY_BOT = PAY_TOP - 56;

  lines.push(filledRect(L, PAY_BOT, R - L, 56, 0.98, 0.98, 0.98));
  lines.push(strokedRect(L, PAY_BOT, R - L, 56, 0.82, 0.82, 0.82, 0.5));

  lines.push(`BT /F1 8 Tf 0.45 0.45 0.45 rg 1 0 0 1 ${L + 6} ${PAY_TOP - 12} Tm (PAYMENT REFERENCE) Tj ET`);

  lines.push(`BT /F1 8 Tf 0.55 0.55 0.55 rg 1 0 0 1 ${L + 6} ${PAY_TOP - 26} Tm (Razorpay Payment ID) Tj ET`);
  lines.push(`BT /F1 9 Tf 0.20 0.20 0.20 rg 1 0 0 1 ${L + 6} ${PAY_TOP - 38} Tm (${escapePdfText(razorpayPaymentId || "--")}) Tj ET`);

  lines.push(`BT /F1 8 Tf 0.55 0.55 0.55 rg 1 0 0 1 ${MID + 8} ${PAY_TOP - 26} Tm (Razorpay Order ID) Tj ET`);
  lines.push(`BT /F1 9 Tf 0.20 0.20 0.20 rg 1 0 0 1 ${MID + 8} ${PAY_TOP - 38} Tm (${escapePdfText(razorpayOrderId || "--")}) Tj ET`);

  // =========================================================================
  // FOOTER
  // =========================================================================
  const FOOTER_Y = PAY_BOT - 20;

  lines.push(hLine(L, FOOTER_Y + 12, R, 0.85, 0.85, 0.85, 0.3));
  lines.push(`BT /F1 8 Tf 0.55 0.55 0.55 rg 1 0 0 1 ${L} ${FOOTER_Y} Tm (This is a system-generated invoice. No physical signature is required.) Tj ET`);
  lines.push(textRight("GST Compliant", R, FOOTER_Y, "F1", 8));

  // =========================================================================
  // Build & return
  // =========================================================================
  const pdfBuffer = buildPdf(lines);
  const fileName  = `${invoiceNumber}.pdf`;

  return {
    invoiceNumber,
    fileName,
    mimeType: "application/pdf",
    base64: pdfBuffer.toString("base64"),
  };
};