import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';

interface InvoiceData {
  invoiceNumber: string;
  issuedDate: string;
  dueDate: string;
  clientName: string;
  clientEmail: string;
  clientAddress?: string;
  items: { description: string; amount: number }[];
  total: number;
  status: string;
  notes?: string;
}

export function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers: Buffer[] = [];
    
    doc.on('data', (chunk: Buffer) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Header
    doc.fontSize(24).font('Helvetica-Bold').fillColor('#1e3a8a')
       .text('2FLY DIGITAL MARKETING', 50, 50);
    doc.fontSize(10).font('Helvetica').fillColor('#666')
       .text('Digital Marketing Agency', 50, 80)
       .text('hello@2flydigital.com', 50, 95);
    
    // Invoice title
    doc.fontSize(28).font('Helvetica-Bold').fillColor('#1e3a8a')
       .text('INVOICE', 400, 50, { align: 'right' });
    doc.fontSize(12).font('Helvetica').fillColor('#333')
       .text(data.invoiceNumber, 400, 85, { align: 'right' });

    // Divider
    doc.moveTo(50, 120).lineTo(545, 120).strokeColor('#e2e8f0').stroke();

    // Bill To + Invoice Details
    const y = 140;
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#666')
       .text('BILL TO', 50, y);
    doc.fontSize(12).font('Helvetica').fillColor('#333')
       .text(data.clientName, 50, y + 18)
       .text(data.clientEmail || '', 50, y + 35);
    if (data.clientAddress) {
      doc.text(data.clientAddress, 50, y + 52);
    }

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#666')
       .text('INVOICE DATE', 350, y)
       .text('DUE DATE', 350, y + 35)
       .text('STATUS', 350, y + 70);
    doc.fontSize(11).font('Helvetica').fillColor('#333')
       .text(new Date(data.issuedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 450, y, { align: 'right' })
       .text(new Date(data.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 450, y + 35, { align: 'right' });
    
    const statusColor = data.status === 'paid' ? '#16a34a' : data.status === 'overdue' ? '#dc2626' : '#f59e0b';
    doc.fontSize(11).font('Helvetica-Bold').fillColor(statusColor)
       .text(data.status.toUpperCase(), 450, y + 70, { align: 'right' });

    // Items table
    const tableY = y + 110;
    doc.rect(50, tableY, 495, 25).fill('#1e3a8a');
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#fff')
       .text('DESCRIPTION', 60, tableY + 7)
       .text('AMOUNT', 450, tableY + 7, { align: 'right' });

    let rowY = tableY + 30;
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      if (i % 2 === 0) {
        doc.rect(50, rowY - 5, 495, 25).fill('#f8fafc');
      }
      doc.fontSize(10).font('Helvetica').fillColor('#333')
         .text(item.description, 60, rowY)
         .text(`$${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 450, rowY, { align: 'right' });
      rowY += 25;
    }

    // Total
    doc.moveTo(350, rowY + 5).lineTo(545, rowY + 5).strokeColor('#e2e8f0').stroke();
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e3a8a')
       .text('TOTAL', 350, rowY + 15)
       .text(`$${data.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 450, rowY + 15, { align: 'right' });

    // Payment instructions
    const payY = rowY + 55;
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#666')
       .text('PAYMENT INSTRUCTIONS', 50, payY);
    doc.fontSize(10).font('Helvetica').fillColor('#333')
       .text('Please make payment via Zelle, bank transfer, or check.', 50, payY + 18)
       .text('For questions about this invoice, contact hello@2flydigital.com', 50, payY + 33);

    if (data.notes) {
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#666')
         .text('NOTES', 50, payY + 60);
      doc.fontSize(10).font('Helvetica').fillColor('#333')
         .text(data.notes, 50, payY + 78);
    }

    // Footer
    doc.fontSize(8).fillColor('#999')
       .text('Thank you for your business!', 50, 750, { align: 'center' })
       .text('2FLY Digital Marketing · hello@2flydigital.com', 50, 762, { align: 'center' });

    doc.end();
  });
}
