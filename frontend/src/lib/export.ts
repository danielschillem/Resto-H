import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ExportPdfOptions {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: (string | number)[][];
  footerRow?: (string | number)[];
  filename: string;
  orientation?: "portrait" | "landscape";
}

export function exportPdf({
  title,
  subtitle,
  headers,
  rows,
  footerRow,
  filename,
  orientation = "portrait",
}: ExportPdfOptions) {
  const doc = new jsPDF({ orientation });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(15, 23, 42); // navy
  doc.rect(0, 0, pageWidth, 38, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Resto-H — SGRH", 14, 16);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Généré le ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`,
    14,
    24,
  );

  // Title
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 50);

  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(subtitle, 14, 58);
  }

  const startY = subtitle ? 64 : 56;

  const body = rows.map((r) => r.map((v) => String(v)));
  if (footerRow) {
    body.push(footerRow.map((v) => String(v)));
  }

  autoTable(doc, {
    startY,
    head: [headers],
    body,
    styles: { fontSize: 9, cellPadding: 4, font: "helvetica" },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [51, 65, 85],
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didParseCell: (data) => {
      // Bold footer row
      if (
        footerRow &&
        data.row.index === body.length - 1 &&
        data.section === "body"
      ) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [241, 245, 249];
      }
    },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`© AIT & ANABASE — Resto-H`, 14, pageHeight - 8);
    doc.text(`Page ${i}/${pageCount}`, pageWidth - 14, pageHeight - 8, {
      align: "right",
    });
  }

  doc.save(filename);
}

export function downloadCsv(rows: (string | number)[][], filename: string) {
  const csv = rows
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
