import PDFDocument from 'pdfkit';

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

export function generateProfessionalInvoicePdf(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ 
      size: 'A4', 
      margin: 0,
      info: {
        Title: `Invoice ${data.invoiceNumber}`,
        Author: '2FLY Digital Marketing',
        Subject: `Invoice for ${data.clientName}`,
        Keywords: 'invoice, digital marketing, 2fly'
      }
    });
    const buffers: Buffer[] = [];
    
    doc.on('data', (chunk: Buffer) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Color scheme - professional blue gradient
    const colors = {
      primary: '#1e3a8a',
      secondary: '#3b82f6', 
      accent: '#60a5fa',
      dark: '#1f2937',
      gray: '#6b7280',
      light: '#f8fafc',
      success: '#059669',
      warning: '#d97706',
      danger: '#dc2626'
    };

    // Header background with gradient effect
    doc.rect(0, 0, 595, 120).fill(colors.primary);
    doc.rect(0, 85, 595, 35).fill(colors.secondary);
    
    // Company logo area (placeholder - you can add actual logo later)
    doc.circle(70, 60, 25).fill('#ffffff').opacity(0.1);
    doc.fontSize(32).font('Helvetica-Bold').fillColor('#ffffff').opacity(1)
       .text('2FLY', 45, 45);
    
    // Company info in header
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#ffffff')
       .text('2FLY DIGITAL MARKETING', 120, 35);
    doc.fontSize(11).font('Helvetica').fillColor('#e5e7eb')
       .text('Premium Digital Marketing Solutions', 120, 58)
       .text('hello@2flydigital.com  •  +1 (781) 606-2445', 120, 75);

    // Invoice title and number - right aligned
    doc.fontSize(36).font('Helvetica-Bold').fillColor('#ffffff')
       .text('INVOICE', 430, 35);
    doc.fontSize(14).font('Helvetica').fillColor('#e5e7eb')
       .text(data.invoiceNumber, 430, 75);

    // Main content area
    const contentStart = 150;
    
    // Client information box
    doc.rect(45, contentStart, 250, 80).strokeColor('#e5e7eb').lineWidth(1).stroke();
    doc.fontSize(10).font('Helvetica-Bold').fillColor(colors.gray)
       .text('BILL TO', 55, contentStart + 15);
    doc.fontSize(14).font('Helvetica-Bold').fillColor(colors.dark)
       .text(data.clientName, 55, contentStart + 35);
    doc.fontSize(11).font('Helvetica').fillColor(colors.gray)
       .text(data.clientEmail || '', 55, contentStart + 53);
    if (data.clientAddress) {
      doc.text(data.clientAddress, 55, contentStart + 68);
    }

    // Invoice details box
    doc.rect(320, contentStart, 230, 80).strokeColor('#e5e7eb').lineWidth(1).stroke();
    
    const detailsX = 335;
    const detailsY = contentStart + 15;
    
    // Invoice details with icons (using simple shapes)
    doc.fontSize(10).font('Helvetica-Bold').fillColor(colors.gray)
       .text('📅 INVOICE DATE', detailsX, detailsY)
       .text('⏰ DUE DATE', detailsX, detailsY + 25)
       .text('📊 STATUS', detailsX, detailsY + 50);
    
    doc.fontSize(11).font('Helvetica').fillColor(colors.dark)
       .text(new Date(data.issuedDate).toLocaleDateString('en-US', { 
         year: 'numeric', month: 'long', day: 'numeric' 
       }), detailsX + 90, detailsY)
       .text(new Date(data.dueDate).toLocaleDateString('en-US', { 
         year: 'numeric', month: 'long', day: 'numeric' 
       }), detailsX + 90, detailsY + 25);
    
    // Status with color coding
    const statusColors = {
      paid: colors.success,
      overdue: colors.danger,
      sent: colors.warning
    };
    const statusColor = statusColors[data.status as keyof typeof statusColors] || colors.gray;
    
    // Status badge
    const statusText = data.status.toUpperCase();
    const statusWidth = doc.widthOfString(statusText, { fontSize: 10 });
    doc.roundedRect(detailsX + 90, detailsY + 45, statusWidth + 16, 18, 9)
       .fill(statusColor);
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff')
       .text(statusText, detailsX + 98, detailsY + 50);

    // Items table
    const tableY = contentStart + 120;
    
    // Table header
    doc.rect(45, tableY, 505, 35).fill(colors.primary);
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#ffffff')
       .text('DESCRIPTION', 60, tableY + 12)
       .text('AMOUNT', 450, tableY + 12);

    // Table rows
    let rowY = tableY + 40;
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      const rowHeight = 35;
      
      // Alternating row colors
      if (i % 2 === 0) {
        doc.rect(45, rowY - 2, 505, rowHeight).fill(colors.light);
      }
      
      doc.fontSize(11).font('Helvetica').fillColor(colors.dark)
         .text(item.description, 60, rowY + 8)
         .fontSize(12).font('Helvetica-Bold')
         .text(`$${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 
               450, rowY + 8);
      
      rowY += rowHeight;
    }

    // Total section with background
    doc.rect(320, rowY + 10, 230, 60).fill(colors.light).strokeColor('#e5e7eb').stroke();
    doc.fontSize(16).font('Helvetica-Bold').fillColor(colors.primary)
       .text('TOTAL AMOUNT', 340, rowY + 25)
       .fontSize(24)
       .text(`$${data.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 
             340, rowY + 45);

    // Payment instructions box
    const payY = rowY + 100;
    doc.rect(45, payY, 505, 70).fill('#f0f9ff').strokeColor(colors.accent).stroke();
    
    doc.fontSize(12).font('Helvetica-Bold').fillColor(colors.primary)
       .text('💳 PAYMENT INSTRUCTIONS', 60, payY + 15);
    doc.fontSize(10).font('Helvetica').fillColor(colors.dark)
       .text('• Payment accepted via Zelle, bank transfer, or business check', 60, payY + 35)
       .text('• Please reference invoice number in payment memo', 60, payY + 50)
       .text('• Questions? Contact hello@2flydigital.com', 60, payY + 65);

    // Notes section (if any)
    if (data.notes) {
      const notesY = payY + 90;
      doc.fontSize(11).font('Helvetica-Bold').fillColor(colors.gray)
         .text('📝 NOTES', 45, notesY);
      doc.fontSize(10).font('Helvetica').fillColor(colors.dark)
         .text(data.notes, 45, notesY + 18, { width: 505 });
    }

    // Footer
    doc.rect(0, 750, 595, 92).fill(colors.dark);
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#ffffff')
       .text('Thank you for choosing 2FLY Digital Marketing!', 0, 770, { align: 'center' });
    doc.fontSize(10).font('Helvetica').fillColor('#9ca3af')
       .text('Growing businesses through strategic digital marketing since 2020', 0, 795, { align: 'center' })
       .text('hello@2flydigital.com  •  www.2flydigital.com  •  Boston, MA', 0, 810, { align: 'center' });

    // Subtle watermark
    doc.fontSize(8).fillColor('#f3f4f6').opacity(0.3)
       .text('2FLY DIGITAL', 250, 400, { rotate: 45 });

    doc.end();
  });
}