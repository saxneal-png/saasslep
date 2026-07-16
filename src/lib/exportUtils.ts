import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export function exportarTablaAExcel(
  data: any[], 
  nombreArchivo: string, 
  columnasSeleccionadas: string[], 
  llavesCampos: string[]
) {
  const dataFiltrada = data.map(item => {
    const objetoLimpio: any = {};
    columnasSeleccionadas.forEach((col, idx) => {
      const key = llavesCampos[idx];
      objetoLimpio[col] = item[key] !== undefined && item[key] !== null ? item[key] : 'No registrado';
    });
    return objetoLimpio;
  });

  const worksheet = XLSX.utils.json_to_sheet(dataFiltrada);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte');
  XLSX.writeFile(workbook, `${nombreArchivo}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportarTablaAPdf(
  data: any[], 
  columnasEtiquetas: string[], 
  llavesCampos: string[], 
  tituloReporte: string
) {
  const doc = new jsPDF('l', 'mm', 'a4');
  
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 51, 102);
  doc.text('SERVICIO LOCAL DE EDUCACIÓN PÚBLICA', 14, 15);
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Sistema de Gestión de Dotaciones | Fecha: ${new Date().toLocaleDateString()}`, 14, 20);
  
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(tituloReporte.toUpperCase(), 14, 32);

  const rows = data.map(item => llavesCampos.map(key => {
    const val = item[key];
    return val !== undefined && val !== null ? String(val) : '';
  }));

  (doc as any).autoTable({
    startY: 38,
    head: [columnasEtiquetas],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [0, 51, 102], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
    styles: { overflow: 'bleed' }
  });

  doc.save(`${tituloReporte.replace(/\s+/g, '_').toLowerCase()}_reporte.pdf`);
}
