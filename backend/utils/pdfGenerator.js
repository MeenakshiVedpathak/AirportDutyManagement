const PDFDocument = require('pdfkit');

const PRIMARY = '#1E3A5F';
const SUCCESS = '#10B981';
const WARNING = '#F59E0B';
const ERROR = '#EF4444';
const LIGHT_GRAY = '#F3F4F6';
const BORDER = '#E5E7EB';

function drawTableRow(doc, columns, y, rowData, isHeader = false, isAlt = false) {
  const rowHeight = 18;
  if (isHeader) {
    doc.rect(columns[0].x - 4, y - 2, columns.reduce((s, c) => s + c.w, 0) + 8, rowHeight).fill(PRIMARY);
  } else if (isAlt) {
    doc.rect(columns[0].x - 4, y - 2, columns.reduce((s, c) => s + c.w, 0) + 8, rowHeight).fill(LIGHT_GRAY);
  }

  columns.forEach((col, i) => {
    const text = String(rowData[i] ?? '—');
    doc
      .fillColor(isHeader ? '#FFFFFF' : '#111827')
      .fontSize(7)
      .text(text, col.x, y, { width: col.w - 4, lineBreak: false, ellipsis: true });
  });

  doc.moveTo(columns[0].x - 4, y + rowHeight - 2)
    .lineTo(columns[columns.length - 1].x + columns[columns.length - 1].w + 4, y + rowHeight - 2)
    .strokeColor(BORDER).lineWidth(0.3).stroke();

  return rowHeight;
}

exports.generateDutyReportPDF = (duties, filters = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));
      doc.on('error', reject);

      const now = new Date();
      const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const pageW = doc.page.width - 60;

      // Header
      doc.fontSize(16).fillColor(PRIMARY).font('Helvetica-Bold').text('Airport Protocol', 30, 30);
      doc.fontSize(9).fillColor('#6B7280').font('Helvetica').text('Income Tax Department — Airport Protocol', 30, 50);
      doc.fontSize(8).fillColor('#6B7280').text(`Generated: ${dateStr}`, 30, 62, { align: 'right', width: pageW });
      doc.moveTo(30, 74).lineTo(30 + pageW, 74).strokeColor(PRIMARY).lineWidth(2).stroke();

      // Summary
      const total = duties.length;
      const completed = duties.filter(d => d.status === 'COMPLETED').length;
      const upcoming = duties.filter(d => d.status === 'UPCOMING').length;
      const cancelled = duties.filter(d => d.status === 'CANCELLED').length;
      const incentive = duties.filter(d => ['BEFORE_OFFICE', 'AFTER_OFFICE'].includes(d.officeType) && d.status === 'COMPLETED').length * 500;

      const summaryItems = [
        { label: 'Total', value: total, color: PRIMARY },
        { label: 'Completed', value: completed, color: SUCCESS },
        { label: 'Upcoming', value: upcoming, color: WARNING },
        { label: 'Cancelled', value: cancelled, color: ERROR },
        { label: 'Incentive', value: `Rs.${incentive}`, color: '#7C3AED' },
      ];
      const boxW = pageW / summaryItems.length;
      summaryItems.forEach((item, i) => {
        const bx = 30 + i * boxW;
        doc.rect(bx, 82, boxW - 6, 34).fill(LIGHT_GRAY);
        doc.rect(bx, 82, 3, 34).fill(item.color);
        doc.fontSize(7).fillColor('#6B7280').font('Helvetica').text(item.label.toUpperCase(), bx + 8, 86);
        doc.fontSize(14).fillColor(item.color).font('Helvetica-Bold').text(String(item.value), bx + 8, 96);
      });

      // Table title
      doc.fontSize(10).fillColor(PRIMARY).font('Helvetica-Bold').text('Duty Report', 30, 125);

      // Table columns (landscape A4 = 842pt wide, minus 60 margins = 782pt)
      const cols = [
        { label: '#', w: 22 },
        { label: 'Subordinate', w: 80 },
        { label: 'Date', w: 50 },
        { label: 'Arr/Dep', w: 42 },
        { label: 'Flight No', w: 50 },
        { label: 'Flight Time', w: 50 },
        { label: 'Route', w: 80 },
        { label: 'Airport', w: 85 },
        { label: 'Terminal', w: 75 },
        { label: 'Type', w: 65 },
        { label: 'Status', w: 55 },
        { label: 'Incentive', w: 48 },
      ];
      let x = 30;
      cols.forEach(c => { c.x = x; x += c.w; });

      let y = 140;
      const pageH = doc.page.height - 60;

      drawTableRow(doc, cols, y, cols.map(c => c.label), true);
      y += 18;

      duties.forEach((d, i) => {
        if (y > pageH - 20) {
          doc.addPage();
          y = 30;
          drawTableRow(doc, cols, y, cols.map(c => c.label), true);
          y += 18;
        }
        const eligible = ['BEFORE_OFFICE', 'AFTER_OFFICE'].includes(d.officeType);
        const row = [
          d.srNo || i + 1,
          d.officerName || '—',
          d.date || '—',
          d.arrivalDeparture || '—',
          d.flightNo || '—',
          d.flightTime || '—',
          `${d.from || '—'} > ${d.to || '—'}`,
          d.airportName || '—',
          d.terminalName || '—',
          (d.officeType || '').replace('_', ' '),
          d.status || '—',
          eligible ? 'Rs.500' : '—',
        ];
        drawTableRow(doc, cols, y, row, false, i % 2 === 1);
        y += 18;
      });

      // Footer
      doc.fontSize(7).fillColor('#9CA3AF').font('Helvetica')
        .text(`Airport Protocol System  |  Total Records: ${total}  |  ${dateStr}`, 30, doc.page.height - 30, { width: pageW, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

exports.generateSubordinateReportPDF = (subordinates) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', layout: 'portrait', margin: 30 });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));
      doc.on('error', reject);

      const now = new Date();
      const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const pageW = doc.page.width - 60;

      // Header
      doc.fontSize(16).fillColor(PRIMARY).font('Helvetica-Bold').text('Airport Protocol', 30, 30);
      doc.fontSize(9).fillColor('#6B7280').font('Helvetica').text('Income Tax Department — Airport Protocol', 30, 50);
      doc.fontSize(8).fillColor('#6B7280').text(`Generated: ${dateStr}`, 30, 62, { align: 'right', width: pageW });
      doc.moveTo(30, 74).lineTo(30 + pageW, 74).strokeColor(PRIMARY).lineWidth(2).stroke();
      doc.fontSize(10).fillColor(PRIMARY).font('Helvetica-Bold').text('Subordinate Summary Report', 30, 82);

      const cols = [
        { label: '#', w: 22 },
        { label: 'Name', w: 90 },
        { label: 'Emp ID', w: 55 },
        { label: 'Phone', w: 65 },
        { label: 'Total', w: 32 },
        { label: 'Done', w: 32 },
        { label: 'Up', w: 28 },
        { label: 'Canc', w: 30 },
        { label: 'Before', w: 35 },
        { label: 'After', w: 32 },
        { label: 'Incentive', w: 55 },
      ];
      let x = 30;
      cols.forEach(c => { c.x = x; x += c.w; });

      let y = 100;
      const pageH = doc.page.height - 60;

      drawTableRow(doc, cols, y, cols.map(c => c.label), true);
      y += 18;

      subordinates.forEach((item, i) => {
        if (y > pageH - 20) {
          doc.addPage();
          y = 30;
          drawTableRow(doc, cols, y, cols.map(c => c.label), true);
          y += 18;
        }
        const o = item.officer || {};
        const row = [
          i + 1,
          o.name || '—',
          o.employeeId || '—',
          o.phone || '—',
          item.totalDuties || 0,
          item.completed || 0,
          item.upcoming || 0,
          item.cancelled || 0,
          item.beforeOffice || 0,
          item.afterOffice || 0,
          `Rs.${item.totalIncentive || 0}`,
        ];
        drawTableRow(doc, cols, y, row, false, i % 2 === 1);
        y += 18;
      });

      doc.fontSize(7).fillColor('#9CA3AF').font('Helvetica')
        .text(`Airport Protocol System  |  Total: ${subordinates.length}  |  ${dateStr}`, 30, doc.page.height - 30, { width: pageW, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
