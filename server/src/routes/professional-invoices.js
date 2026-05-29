const express = require("express");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const router = express.Router();

// GET /api/professional-invoices/:id — generate beautiful invoice HTML
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { client: true },
    });

    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body { 
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
      line-height: 1.6; color: #1f2937; background: #ffffff;
    }
    
    .container { max-width: 800px; margin: 0 auto; background: white; min-height: 100vh; }
    
    .header { 
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); 
      color: white; padding: 40px 60px; position: relative; overflow: hidden;
    }
    
    .header::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -20%;
      width: 200px;
      height: 200px;
      border-radius: 50%;
      background: rgba(255,255,255,0.1);
    }
    
    .logo-section {
      margin-bottom: 20px;
    }
    
    .logo {
      width: 180px; height: auto;
      filter: brightness(0) invert(1); /* Makes logo white for blue header */
    }
    
    .company { 
      font-size: 32px; font-weight: 700; 
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .tagline { opacity: 0.9; font-size: 14px; margin-bottom: 4px; }
    .contact { opacity: 0.8; font-size: 14px; }
    
    .invoice-section { 
      position: absolute; right: 60px; top: 40px; text-align: right; 
    }
    
    .invoice-title { 
      font-size: 48px; font-weight: 700; margin-bottom: 8px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .invoice-number { 
      font-size: 16px; opacity: 0.9; background: rgba(255,255,255,0.1);
      padding: 8px 16px; border-radius: 20px; display: inline-block;
    }
    
    .content { padding: 60px; }
    
    .details { 
      display: grid; grid-template-columns: 1fr 1fr; gap: 60px; 
      margin-bottom: 50px;
    }
    
    .bill-section {
      background: #f8fafc; padding: 30px; border-radius: 12px;
      border: 1px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    }
    
    .label { 
      font-weight: 600; color: #374151; font-size: 12px; 
      text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;
      display: flex; align-items: center;
    }
    
    .label::before {
      content: '';
      width: 4px; height: 4px; background: #3b82f6;
      border-radius: 50%; margin-right: 8px;
    }
    
    .client-name { 
      font-size: 22px; font-weight: 600; color: #1f2937; 
      margin-bottom: 8px;
    }
    
    .client-email { color: #6b7280; margin-bottom: 4px; }
    
    .info-row { 
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 0; border-bottom: 1px solid #f3f4f6;
    }
    
    .info-row:last-child { border-bottom: none; }
    
    .info-label { 
      font-weight: 500; color: #374151; font-size: 14px;
      display: flex; align-items: center;
    }
    
    .info-value { font-weight: 600; color: #1f2937; }
    
    .status-badge { 
      padding: 6px 16px; border-radius: 20px; font-weight: 600; 
      font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;
    }
    
    .status-badge.paid { 
      background: linear-gradient(135deg, #d1fae5, #a7f3d0); 
      color: #065f46; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.1);
    }
    
    .status-badge.overdue { 
      background: linear-gradient(135deg, #fee2e2, #fecaca); 
      color: #991b1b; box-shadow: 0 2px 4px rgba(239, 68, 68, 0.1);
    }
    
    .status-badge.sent { 
      background: linear-gradient(135deg, #fef3c7, #fde68a); 
      color: #92400e; box-shadow: 0 2px 4px rgba(245, 158, 11, 0.1);
    }
    
    .table-container {
      border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);
      margin: 40px 0;
    }
    
    .table { 
      width: 100%; border-collapse: collapse; 
    }
    
    .table th { 
      background: linear-gradient(135deg, #1e3a8a, #3b82f6); 
      color: white; padding: 20px 30px; text-align: left; font-weight: 600;
      font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;
    }
    
    .table td { 
      padding: 25px 30px; border-bottom: 1px solid #f1f5f9; 
      background: white;
    }
    
    .table tr:nth-child(even) td { background: #f8fafc; }
    
    .item-description { font-weight: 500; color: #1f2937; font-size: 16px; }
    
    .item-amount { 
      text-align: right; font-weight: 600; color: #1f2937; 
      font-size: 18px;
    }
    
    .total-section {
      background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
      padding: 30px; border-radius: 12px; border: 2px solid #3b82f6;
      margin: 40px 0; text-align: right;
    }
    
    .total-label { 
      font-size: 18px; font-weight: 600; color: #1e3a8a; 
      margin-bottom: 8px;
    }
    
    .total-amount { 
      font-size: 36px; font-weight: 700; color: #1e3a8a;
      text-shadow: 0 2px 4px rgba(30, 58, 138, 0.1);
    }
    
    .payment-info { 
      background: linear-gradient(135deg, #f0f9ff, #e0f2fe); 
      padding: 30px; border-radius: 12px; 
      border-left: 6px solid #3b82f6; margin: 40px 0;
    }
    
    .payment-title {
      font-weight: 600; color: #1e3a8a; font-size: 16px; 
      margin-bottom: 16px; display: flex; align-items: center;
    }
    
    .payment-title::before {
      content: '💳';
      margin-right: 8px; font-size: 18px;
    }
    
    .payment-item {
      display: flex; align-items: center; margin-bottom: 8px;
      color: #374151; font-size: 14px;
    }
    
    .payment-item::before {
      content: '•';
      color: #3b82f6; font-weight: bold; margin-right: 12px;
    }
    
    .notes { 
      background: #fffbeb; padding: 25px; border-radius: 12px; 
      border-left: 6px solid #f59e0b; margin: 30px 0;
    }
    
    .notes-title {
      font-weight: 600; color: #92400e; margin-bottom: 12px;
      display: flex; align-items: center;
    }
    
    .notes-title::before {
      content: '📝';
      margin-right: 8px;
    }
    
    .footer { 
      background: #1f2937; color: white; padding: 40px 60px; 
      text-align: center;
    }
    
    .footer-main { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
    .footer-sub { opacity: 0.7; font-size: 14px; }
    
    @media print {
      .container { margin: 0; box-shadow: none; }
      .header::before { display: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-section">
        <img src="/2fly-logo.png" class="logo" alt="2FLY Digital Marketing">
      </div>
      <div class="tagline">Premium Digital Marketing Solutions</div>
      <div class="contact">hello@2flydigital.com  •  +1 (781) 606-2445</div>
      
      <div class="invoice-section">
        <div class="invoice-title">INVOICE</div>
        <div class="invoice-number">${invoice.invoiceNumber}</div>
      </div>
    </div>

    <div class="content">
      <div class="details">
        <div class="bill-section">
          <div class="label">Bill To</div>
          <div class="client-name">${invoice.client.name}</div>
          <div class="client-email">${invoice.client.contactEmail || ''}</div>
        </div>
        
        <div class="bill-section">
          <div class="info-row">
            <div class="info-label">📅 Invoice Date</div>
            <div class="info-value">${new Date(invoice.issuedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </div>
          <div class="info-row">
            <div class="info-label">⏰ Due Date</div>
            <div class="info-value">${new Date(invoice.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </div>
          <div class="info-row">
            <div class="info-label">📊 Status</div>
            <div><span class="status-badge ${invoice.status}">${invoice.status.toUpperCase()}</span></div>
          </div>
        </div>
      </div>

      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: right; width: 200px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="item-description">${invoice.description}</td>
              <td class="item-amount">$${invoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="total-section">
        <div class="total-label">Total Amount</div>
        <div class="total-amount">$${invoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
      </div>

      <div class="payment-info">
        <div class="payment-title">Payment Instructions</div>
        <div class="payment-item">Payment accepted via Zelle, bank transfer, or business check</div>
        <div class="payment-item">Please reference invoice number in payment memo</div>
        <div class="payment-item">Questions? Contact hello@2flydigital.com</div>
      </div>

      ${invoice.notes ? `
        <div class="notes">
          <div class="notes-title">Notes</div>
          <div>${invoice.notes}</div>
        </div>
      ` : ''}
    </div>

    <div class="footer">
      <div class="footer-main">Thank you for choosing 2FLY Digital Marketing!</div>
      <div class="footer-sub">Growing businesses through strategic digital marketing since 2020</div>
      <div class="footer-sub" style="margin-top: 8px;">hello@2flydigital.com  •  www.2flydigital.com  •  Boston, MA</div>
    </div>
  </div>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;