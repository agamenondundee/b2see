// Export helpers for spreadsheets, PDFs and evidence pack archives. Exports carry no
// generator metadata and use British English in their content, which is supplied by
// the callers.

import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import archiver from 'archiver';

export interface Column {
  header: string;
  key: string;
  width?: number;
}

export async function toXlsx(sheetName: string, columns: Column[], rows: Record<string, unknown>[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Cloud.ax ISMS';
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 24 }));
  sheet.addRows(rows);
  sheet.getRow(1).font = { bold: true };
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// Renders a titled document with a heading and a list of text lines, plus an optional
// table rendered as aligned rows. Kept deliberately simple and dependency light.
export function toPdf(title: string, sections: { heading?: string; lines: string[] }[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text(title);
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor('#666').text(`Generated ${new Date().toISOString().slice(0, 10)}`);
    doc.fillColor('#000').moveDown();

    for (const section of sections) {
      if (section.heading) {
        doc.moveDown(0.5).fontSize(13).text(section.heading);
        doc.moveDown(0.25);
      }
      doc.fontSize(10);
      for (const line of section.lines) doc.text(line);
    }
    doc.end();
  });
}

export interface ZipEntry {
  name: string;
  data: Buffer;
}

export function buildZip(entries: ZipEntry[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('data', (c: Buffer) => chunks.push(c));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);
    for (const entry of entries) archive.append(entry.data, { name: entry.name });
    void archive.finalize();
  });
}
