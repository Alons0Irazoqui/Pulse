
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TuitionRecord, AcademySettings, UserProfile, PaymentHistoryItem } from '../types';

interface ReceiptOptions {
    paymentStatus?: string;
    currentPaymentAmount?: number;
    paymentHistory?: PaymentHistoryItem[];
}

export const generateReceipt = (
    record: TuitionRecord, 
    academy: AcademySettings, 
    user?: UserProfile | null,
    options?: ReceiptOptions
) => {
    // --- 1. ENGINE FINANCIERO (Lógica Contable) ---
    const baseAmount = record.originalAmount !== undefined ? record.originalAmount : record.amount;
    const penaltyAmount = record.penaltyAmount || 0;
    const grandTotal = baseAmount + penaltyAmount;
    
    // Historial de abonos para el desglose
    const history = record.paymentHistory || [];
    const totalPaid = history.reduce((sum, p) => sum + p.amount, 0);
    const balanceDue = Math.max(0, grandTotal - totalPaid);

    const formatMoney = (val: number) => `$${val.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

    // --- 2. CONFIGURACIÓN DEL DOCUMENTO ---
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const rightAlignX = 190; // Margen derecho estándar

    // Paleta de Colores Corporativa
    const darkGray = [51, 51, 51];    // #333333
    const softGray = [119, 119, 119];  // #777777
    const borderGray = [220, 220, 220]; // #DCDCDC
    const pureBlack = [0, 0, 0];
    const dangerRed = [220, 38, 38];   // #DC2626
    const successGreen = [22, 163, 74]; // #16A34A

    doc.setFont('helvetica');

    // --- 3. ENCABEZADO (SPLIT DESIGN) ---
    
    // Izquierda: Datos Academia
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text(academy.name.toUpperCase(), margin, 25);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(softGray[0], softGray[1], softGray[2]);
    doc.text(academy.code || 'ID ACADEMIA', margin, 31);

    // Derecha: Metadatos del Recibo
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(softGray[0], softGray[1], softGray[2]);
    const labelDoc = 'RECIBO DE PAGO';
    doc.text(labelDoc, rightAlignX - doc.getTextWidth(labelDoc), 25, { charSpace: 1 });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const folio = `Folio: #${record.id.split('-').pop()?.toUpperCase() || 'REF'}`;
    const emission = `Emisión: ${new Date().toLocaleDateString('es-MX')}`;
    doc.text(folio, rightAlignX - doc.getTextWidth(folio), 30);
    doc.text(emission, rightAlignX - doc.getTextWidth(emission), 34);

    // Línea Divisoria Header
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.1);
    doc.line(margin, 42, rightAlignX, 42);

    // --- 4. BLOQUE DE INFORMACIÓN DEL CLIENTE (COMPACTO) ---
    const clientBoxY = 48;
    const boxHeight = 18;
    
    doc.setFillColor(250, 250, 250); // #FAFAFA
    doc.roundedRect(margin, clientBoxY, rightAlignX - margin, boxHeight, 2, 2, 'F');
    
    doc.setFontSize(9);
    doc.setTextColor(softGray[0], softGray[1], softGray[2]);
    doc.text('FACTURADO A:', margin + 5, clientBoxY + 7);
    doc.text('CONCEPTO PRINCIPAL:', margin + 95, clientBoxY + 7);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text(record.studentName?.toUpperCase() || 'ALUMNO REGISTRADO', margin + 5, clientBoxY + 13);
    doc.text(record.concept.toUpperCase(), margin + 95, clientBoxY + 13);

    // --- 5. TABLA DE DESGLOSE (ESTILO CLEAN) ---
    const tableBody = [];

    // Fila 1: Cargo Principal
    tableBody.push([
        { content: `${record.concept}\n(Costo del Servicio)`, styles: { fontStyle: 'bold' } },
        formatDate(record.dueDate),
        formatMoney(baseAmount)
    ]);

    // Fila 2: Recargo (si aplica)
    if (penaltyAmount > 0) {
        tableBody.push([
            { content: 'Recargo por pago tardío / Mora', styles: { textColor: dangerRed } },
            formatDate(record.dueDate),
            { content: formatMoney(penaltyAmount), styles: { textColor: dangerRed } }
        ]);
    }

    // Filas: Historial de Abonos
    history.forEach((pay, idx) => {
        tableBody.push([
            { content: `(-) Abono #${idx + 1} vía ${pay.method || 'Transferencia'}`, styles: { textColor: softGray, fontSize: 8 } },
            formatDate(pay.date),
            { content: `(${formatMoney(pay.amount)})`, styles: { textColor: successGreen, fontStyle: 'bold' } }
        ]);
    });

    autoTable(doc, {
        startY: 72,
        margin: { left: margin, right: pageWidth - rightAlignX },
        head: [['DESCRIPCIÓN', 'FECHA', 'IMPORTE']],
        body: tableBody,
        theme: 'plain',
        headStyles: {
            fillColor: [255, 255, 255],
            textColor: darkGray,
            fontStyle: 'bold',
            fontSize: 10,
            lineWidth: { bottom: 0.1 },
            lineColor: borderGray
        },
        bodyStyles: {
            fontSize: 9,
            cellPadding: 4,
            textColor: darkGray
        },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { halign: 'center', cellWidth: 40 },
            2: { halign: 'right', cellWidth: 40 }
        }
    });

    // --- 6. SECCIÓN DE RESUMEN (TOTALES) ---
    let finalY = (doc as any).lastAutoTable.finalY + 10;
    const summaryWidth = 70;
    const summaryX = rightAlignX - summaryWidth;

    const drawSummaryRow = (label: string, value: string, size = 9, isBold = false, color = darkGray) => {
        doc.setFontSize(size);
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        doc.setTextColor(color[0], color[1], color[2]);
        doc.text(label, summaryX, finalY);
        doc.text(value, rightAlignX, finalY, { halign: 'right' });
        finalY += size === 12 ? 10 : 6;
    };

    drawSummaryRow('Importe Total:', formatMoney(grandTotal));
    drawSummaryRow('Total Pagado:', `-${formatMoney(totalPaid)}`);

    // Línea fina antes del saldo
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.line(summaryX, finalY - 2, rightAlignX, finalY - 2);
    finalY += 4;

    const statusLabel = balanceDue === 0 ? 'ESTADO: LIQUIDADO' : 'SALDO PENDIENTE:';
    const statusColor = balanceDue === 0 ? successGreen : dangerRed;
    
    drawSummaryRow(statusLabel, formatMoney(balanceDue), 12, true, statusColor);

    // --- 7. PIE DE PÁGINA (ABSOLUTO) ---
    doc.setFontSize(8);
    doc.setTextColor(200, 200, 200); // Gris muy claro
    const footerText = 'Gracias por su preferencia. Documento generado por Pulse / IKC Management.';
    doc.text(footerText, pageWidth / 2, 280, { halign: 'center' });

    // --- 8. EJECUCIÓN ---
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
};
