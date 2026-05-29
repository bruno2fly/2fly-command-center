const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { generateProfessionalInvoicePdf } = require("../lib/invoicePdf-professional.ts");
const prisma = new PrismaClient();
const router = express.Router();

// GET /api/invoices — list all invoices
router.get("/", async (req, res) => {
  try {
    const { clientId, status } = req.query;
    const where = {};
    if (clientId) where.clientId = clientId;
    if (status) where.status = status;

    const invoices = await prisma.invoice.findMany({
      where,
      include: { client: { select: { name: true, contactName: true, contactEmail: true } } },
      orderBy: { dueDate: "desc" },
    });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/invoices — create new invoice
router.post("/", async (req, res) => {
  try {
    const { clientId, amount, description, type, dueDate, notes } = req.body;
    if (!clientId || !amount) return res.status(400).json({ error: "clientId and amount required" });

    // Auto-generate invoice number
    const lastInvoice = await prisma.invoice.findFirst({ orderBy: { createdAt: "desc" } });
    const lastNum = lastInvoice ? parseInt(lastInvoice.invoiceNumber.replace("INV-", "")) : 100;
    const invoiceNumber = `INV-${lastNum + 1}`;

    const invoice = await prisma.invoice.create({
      data: {
        clientId,
        invoiceNumber,
        amount: parseFloat(amount),
        description: description || `${new Date().toLocaleString("en-US", { month: "long", year: "numeric" })} retainer`,
        type: type || "retainer",
        dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 86400000), // 30 days default
        status: "sent",
        notes: notes || null,
      },
      include: { client: { select: { name: true } } },
    });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/invoices/:id — update invoice (mark paid, change status, etc.)
router.patch("/:id", async (req, res) => {
  try {
    const { status, paidDate, paidAmount, notes, amount, dueDate } = req.body;
    const data = { updatedAt: new Date() };

    if (status) data.status = status;
    if (status === "paid") {
      data.paidDate = paidDate ? new Date(paidDate) : new Date();
      data.paidAmount = paidAmount ? parseFloat(paidAmount) : undefined;
    }
    if (notes !== undefined) data.notes = notes;
    if (amount !== undefined) data.amount = parseFloat(amount);
    if (dueDate) data.dueDate = new Date(dueDate);

    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data,
      include: { client: { select: { name: true, contactName: true, contactEmail: true } } },
    });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/invoices/:id
router.delete("/:id", async (req, res) => {
  try {
    await prisma.invoice.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/invoices/:id/html — generate printable HTML invoice
router.get("/:id/html", async (req, res) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { client: { select: { name: true, contactName: true, contactEmail: true } } },
    });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    const statusColor = invoice.status === "paid" ? "#10b981" : invoice.status === "overdue" ? "#ef4444" : "#f59e0b";
    const statusLabel = invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1);
    const issuedStr = new Date(invoice.issuedDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const dueStr = new Date(invoice.dueDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const paidStr = invoice.paidDate ? new Date(invoice.paidDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : null;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${invoice.invoiceNumber} - 2FLY Digital Marketing</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; background: #fff; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #1a1a1a; padding-bottom: 20px; }
    .brand h1 { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
    .brand p { color: #666; font-size: 13px; margin-top: 4px; }
    .invoice-meta { text-align: right; }
    .invoice-meta h2 { font-size: 32px; font-weight: 300; color: #666; margin-bottom: 8px; }
    .invoice-meta .number { font-size: 18px; font-weight: 600; }
    .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; color: white; background: ${statusColor}; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .party h3 { font-size: 11px; text-transform: uppercase; color: #999; letter-spacing: 1px; margin-bottom: 8px; }
    .party p { font-size: 14px; line-height: 1.6; }
    .dates { display: flex; gap: 40px; margin-bottom: 40px; }
    .date-item label { font-size: 11px; text-transform: uppercase; color: #999; letter-spacing: 1px; }
    .date-item p { font-size: 14px; font-weight: 500; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { text-align: left; font-size: 11px; text-transform: uppercase; color: #999; letter-spacing: 1px; padding: 12px 0; border-bottom: 1px solid #e5e5e5; }
    td { padding: 16px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
    .amount-col { text-align: right; }
    .total-row { border-top: 2px solid #1a1a1a; }
    .total-row td { font-size: 20px; font-weight: 700; padding-top: 16px; }
    .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #e5e5e5; color: #999; font-size: 12px; text-align: center; }
    .notes { background: #f8f8f8; padding: 16px; border-radius: 8px; margin-bottom: 30px; font-size: 13px; color: #666; }
    .notes strong { color: #333; }
    ${paidStr ? '.paid-stamp { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 80px; font-weight: 900; color: rgba(16, 185, 129, 0.1); letter-spacing: 10px; pointer-events: none; }' : ''}
    @media print { body { padding: 20px; } .no-print { display: none; } }
  </style>
</head>
<body>
  ${paidStr ? '<div class="paid-stamp">PAID</div>' : ''}
  <div class="no-print" style="margin-bottom: 20px; text-align: right;">
    <button onclick="window.print()" style="background: #1a1a1a; color: white; border: none; padding: 10px 24px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;">
      📄 Save as PDF / Print
    </button>
  </div>

  <div class="header">
    <div class="brand">
      <h1>2FLY</h1>
      <p>Digital Marketing</p>
    </div>
    <div class="invoice-meta">
      <h2>INVOICE</h2>
      <p class="number">${invoice.invoiceNumber}</p>
      <div style="margin-top: 8px;"><span class="status">${statusLabel}</span></div>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>From</h3>
      <p><strong>2FLY Digital Marketing</strong><br>Bruno Lima<br>hello@2flydigital.com</p>
    </div>
    <div class="party" style="text-align: right;">
      <h3>Bill To</h3>
      <p><strong>${invoice.client.name}</strong>${invoice.client.contactName ? '<br>' + invoice.client.contactName : ''}${invoice.client.contactEmail ? '<br>' + invoice.client.contactEmail : ''}</p>
    </div>
  </div>

  <div class="dates">
    <div class="date-item">
      <label>Issued</label>
      <p>${issuedStr}</p>
    </div>
    <div class="date-item">
      <label>Due Date</label>
      <p>${dueStr}</p>
    </div>
    ${paidStr ? `<div class="date-item"><label>Paid</label><p style="color: #10b981; font-weight: 600;">${paidStr}</p></div>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Type</th>
        <th class="amount-col">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${invoice.description || 'Marketing services'}</td>
        <td>${invoice.type.charAt(0).toUpperCase() + invoice.type.slice(1)}</td>
        <td class="amount-col">$${invoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
      </tr>
      <tr class="total-row">
        <td colspan="2">Total</td>
        <td class="amount-col">$${invoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
      </tr>
    </tbody>
  </table>

  ${invoice.notes ? `<div class="notes"><strong>Notes:</strong> ${invoice.notes}</div>` : ''}

  <div class="footer">
    <p>2FLY Digital Marketing · Thank you for your business!</p>
    <p style="margin-top: 4px;">Payment via bank transfer or check</p>
  </div>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/invoices/:id/pdf — generate professional PDF
router.get("/:id/pdf", async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { client: true },
    });

    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    const pdfData = {
      invoiceNumber: invoice.invoiceNumber,
      issuedDate: invoice.issuedDate.toISOString(),
      dueDate: invoice.dueDate.toISOString(),
      clientName: invoice.client.name,
      clientEmail: invoice.client.contactEmail || '',
      clientAddress: invoice.client.address || '',
      items: [{ description: invoice.description, amount: invoice.amount }],
      total: invoice.amount,
      status: invoice.status,
      notes: invoice.notes,
    };

    const pdfBuffer = await generateProfessionalInvoicePdf(pdfData);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Invoice-${invoice.invoiceNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
