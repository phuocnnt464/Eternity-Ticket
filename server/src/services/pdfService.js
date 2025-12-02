const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

class PDFService {
  static async generateTicketPDF(ticketData) {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const qrCodeDataURL = await QRCode.toDataURL(ticketData.qr_code_data);

        doc.fontSize(24).text('ETERNITY TICKET', { align: 'center' });
        doc.moveDown();
        doc.fontSize(20).text(ticketData.event_title, { align: 'center' });
        doc.moveDown(2);

        doc.fontSize(12);
        doc.text(`Session: ${ticketData.session_title}`);
        doc.text(`Date: ${new Date(ticketData.session_start_time).toLocaleString()}`);
        doc.text(`Venue: ${ticketData.venue_name}`);
        doc.moveDown();

        doc.fontSize(14).text('Ticket Information', { underline: true });
        doc.fontSize(12);
        doc.text(`Ticket Code: ${ticketData.ticket_code}`);
        doc.text(`Ticket Type: ${ticketData.ticket_type_name}`);
        doc.text(`Holder: ${ticketData.holder_name}`);
        doc.text(`Email: ${ticketData.holder_email}`);
        doc.text(`Order Number: ${ticketData.order_number}`);
        doc.moveDown(2);

        doc.fontSize(14).text('Check-in QR Code', { align: 'center' });
        doc.image(qrCodeDataURL, {
          fit: [200, 200],
          align: 'center'
        });
        doc.moveDown();

        doc.fontSize(10).text('Please present this ticket at the venue entrance.', {
          align: 'center'
        });
        doc.text('Eternity Ticket © 2025', { align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  static async generateOrderTicketsPDF(tickets) {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        for (let i = 0; i < tickets.length; i++) {
          const ticket = tickets[i];
          
          if (i > 0) {
            doc.addPage();
          }

          const qrCodeDataURL = await QRCode.toDataURL(ticket.qr_code_data);

          doc.fontSize(24).text('ETERNITY TICKET', { align: 'center' });
          doc.moveDown();
          doc.fontSize(20).text(ticket.event_title, { align: 'center' });
          doc.moveDown(2);

          doc.fontSize(12);
          doc.text(`Session: ${ticket.session_title}`);
          doc.text(`Date: ${new Date(ticket.session_start_time).toLocaleString()}`);
          doc.text(`Venue: ${ticket.venue_name}`);
          doc.moveDown();

          doc.fontSize(14).text('Ticket Information', { underline: true });
          doc.fontSize(12);
          doc.text(`Ticket Code: ${ticket.ticket_code}`);
          doc.text(`Ticket Type: ${ticket.ticket_type_name}`);
          doc.text(`Holder: ${ticket.holder_name}`);
          doc.text(`Email: ${ticket.holder_email}`);
          doc.text(`Order Number: ${ticket.order_number}`);
          doc.moveDown(2);

          doc.fontSize(14).text('Check-in QR Code', { align: 'center' });
          doc.image(qrCodeDataURL, {
            fit: [200, 200],
            align: 'center'
          });
          doc.moveDown();

          doc.fontSize(10).text(
            `Ticket ${i + 1} of ${tickets.length}`,
            { align: 'center' }
          );
          doc.text('Please present this ticket at the venue entrance.', {
            align: 'center'
          });
          doc.text('Eternity Ticket © 2025', { align: 'center' });
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = PDFService;