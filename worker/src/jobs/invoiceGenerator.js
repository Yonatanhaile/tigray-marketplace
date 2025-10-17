const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const logger = require('../services/logger');
const { uploadFile: uploadToCloudinary } = require('../services/cloudinary');
const { uploadFile: uploadToS3, USE_S3 } = require('../services/s3');
const { notifyInvoiceReady } = require('../services/socketNotifier');

// Define Invoice model here or import from server
const Invoice = mongoose.model('Invoice') || require('./invoiceModel');

/**
 * Generate HTML template for invoice
 */
const generateInvoiceHTML = (data) => {
  const {
    orderNumber,
    invoiceNumber,
    listingTitle,
    price,
    currency,
    buyer,
    seller,
    createdAt,
    status,
    issuedDate,
  } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoiceNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      padding: 40px;
      color: #333;
      line-height: 1.6;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 40px;
    }
    .header {
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #2563eb;
      font-size: 32px;
      margin-bottom: 10px;
    }
    .header p {
      color: #666;
      font-size: 14px;
    }
    .invoice-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
    }
    .info-block {
      flex: 1;
    }
    .info-block h3 {
      color: #2563eb;
      font-size: 14px;
      text-transform: uppercase;
      margin-bottom: 10px;
    }
    .info-block p {
      margin: 5px 0;
      font-size: 14px;
    }
    .details {
      margin: 40px 0;
    }
    .details table {
      width: 100%;
      border-collapse: collapse;
    }
    .details th {
      background: #f3f4f6;
      padding: 15px;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid #e5e7eb;
    }
    .details td {
      padding: 15px;
      border-bottom: 1px solid #e5e7eb;
    }
    .total {
      text-align: right;
      margin-top: 30px;
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
    }
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
    .disclaimer {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 30px 0;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>INVOICE</h1>
      <p>Tigray Marketplace - Regional Trade Platform</p>
    </div>

    <div class="invoice-info">
      <div class="info-block">
        <h3>Invoice Details</h3>
        <p><strong>Invoice #:</strong> ${invoiceNumber}</p>
        <p><strong>Order #:</strong> ${orderNumber}</p>
        <p><strong>Issue Date:</strong> ${new Date(issuedDate).toLocaleDateString()}</p>
        <p><strong>Status:</strong> ${status}</p>
      </div>
      
      <div class="info-block">
        <h3>Seller</h3>
        <p><strong>${seller.name}</strong></p>
        <p>${seller.email}</p>
        <p>${seller.phone}</p>
      </div>
      
      <div class="info-block">
        <h3>Buyer</h3>
        <p><strong>${buyer.name}</strong></p>
        <p>${buyer.email}</p>
        <p>${buyer.phone}</p>
      </div>
    </div>

    <div class="details">
      <table>
        <thead>
          <tr>
            <th>Item Description</th>
            <th>Order Date</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>${listingTitle}</strong></td>
            <td>${new Date(createdAt).toLocaleDateString()}</td>
            <td>${price.toLocaleString()} ${currency}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="total">
      Total: ${price.toLocaleString()} ${currency}
    </div>

    <div class="disclaimer">
      <strong>⚠️ Payment Disclaimer:</strong><br>
      This platform does NOT process payments. This invoice is for record-keeping purposes only. 
      All transactions are between buyer and seller. The platform is not liable for payment disputes.
    </div>

    <div class="footer">
      <p>Tigray Marketplace &copy; ${new Date().getFullYear()}</p>
      <p>Generated on ${new Date(issuedDate).toLocaleString()}</p>
      <p>This is an automated invoice. For questions, contact the seller directly.</p>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Generate PDF invoice using Puppeteer
 */
const generateInvoicePDF = async (invoiceId, orderData) => {
  const startTime = Date.now();
  
  try {
    // Fetch invoice record from DB
    const invoice = await Invoice.findById(invoiceId);
    
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Update status to processing
    invoice.status = 'processing';
    await invoice.save();

    // Prepare data
    const invoiceData = {
      ...orderData,
      invoiceNumber: invoice.invoiceNumber,
      issuedDate: new Date(),
    };

    // Generate HTML
    const html = generateInvoiceHTML(invoiceData);

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    });

    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: 'networkidle0',
    });

    // Generate PDF buffer
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px',
      },
    });

    await browser.close();

    const fileSize = pdfBuffer.length;
    logger.info(`PDF generated: ${fileSize} bytes`);

    // Upload to cloud storage
    let uploadResult;
    
    if (USE_S3) {
      const key = `invoices/${invoice.invoiceNumber}.pdf`;
      uploadResult = await uploadToS3(pdfBuffer, key, 'application/pdf');
    } else {
      uploadResult = await uploadToCloudinary(pdfBuffer, {
        folder: 'invoices',
        publicId: invoice.invoiceNumber,
        resourceType: 'raw',
      });
    }

    const generationTime = Date.now() - startTime;

    // Update invoice record
    invoice.generatedPdfUrl = uploadResult.url;
    invoice.generatedPdfPublicId = uploadResult.publicId || uploadResult.key;
    invoice.status = 'completed';
    invoice.completedAt = new Date();
    invoice.metadata = {
      fileSize,
      generationTimeMs: generationTime,
    };
    await invoice.save();

    // Notify via Socket.io (if server is accessible)
    try {
      await notifyInvoiceReady(invoice.issuerId, {
        invoiceId: invoice._id,
        orderId: invoice.orderId,
        pdfUrl: uploadResult.url,
      });
    } catch (notifyError) {
      logger.warn('Failed to send Socket.io notification:', notifyError.message);
    }

    return {
      success: true,
      pdfUrl: uploadResult.url,
      fileSize,
      generationTime,
    };
  } catch (error) {
    logger.error('PDF generation error:', error);

    // Update invoice status to failed
    try {
      const invoice = await Invoice.findById(invoiceId);
      if (invoice) {
        invoice.status = 'failed';
        invoice.errorMessage = error.message;
        await invoice.save();
      }
    } catch (updateError) {
      logger.error('Failed to update invoice status:', updateError);
    }

    throw error;
  }
};

module.exports = {
  generateInvoicePDF,
  generateInvoiceHTML,
};

