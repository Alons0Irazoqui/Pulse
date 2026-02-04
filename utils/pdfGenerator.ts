
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TuitionRecord, AcademySettings, UserProfile } from '../types';

/**
 * Genera un comprobante de pago estilo "Fintech Premium".
 * Mezcla la estética de Spin, Nu y Stripe.
 * Idioma: Español.
 */
export const generateReceipt = (
    record: TuitionRecord, 
    academy: AcademySettings, 
    user?: UserProfile | null
) => {
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const centerX = pageWidth / 2;
    
    // Paleta Enterprise
    const colorRedIKC = [220, 38, 38];      // #DC2626
    const colorTextMain = [17, 24, 39];     // #111827
    const colorTextMuted = [107, 114, 128];    // #6B7280
    
    // Success Badge Colors (Fintech Soft Style / Glass Effect)
    const colorSuccessText = [21, 128, 61];    // Verde Oscuro (Green 700)
    const colorSuccessBG = [220, 252, 231];    // Verde Muy Claro (Green 100)
    
    // Pending Badge Colors
    const colorPendingText = [75, 85, 99];     // Gray 600
    const colorPendingBG = [243, 244, 246];    // Gray 100

    const formatMoney = (val: number) => `$${val.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '---';
        return new Date(dateStr).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
    };

    // --- CÁLCULOS FINANCIEROS ROBUSTOS ---
    // 1. Historial de Pagos
    const history = record.paymentHistory || [];
    const totalPaid = history.reduce((sum, p) => sum + p.amount, 0);
    
    // 2. Penalty Recovery Logic
    // If the record is paid, the penaltyAmount property is 0. We must check customPenaltyAmount 
    // where we stored the penalty history during approval.
    const historicalPenalty = record.status === 'paid' ? (record.customPenaltyAmount || 0) : (record.penaltyAmount || 0);

    // 3. Deuda Pendiente Actual (Solo si no está pagado)
    const currentDebt = record.status === 'paid' ? 0 : (record.amount + historicalPenalty);

    // 4. Gran Total Histórico (Valor Real de la Transacción)
    // If paid, granTotal is mostly totalPaid. If not paid, currentDebt. 
    // Specifically: Original (likely includes penalty if it was overdue) -> No, we want Base + Penalty.
    // record.originalAmount usually holds the total including penalty if paid.
    // Safe calc: Base (inferred) + Penalty.
    const grandTotal = (record.originalAmount ?? record.amount) + (record.status === 'paid' ? 0 : historicalPenalty); 
    // Note: When paid, originalAmount is updated to include penalty. When unpaid, it might not be.
    // Let's rely on totalPaid logic if paid.
    const finalTotal = record.status === 'paid' ? totalPaid : grandTotal;

    // 5. Monto Base Original (Sin Recargo)
    const baseAmount = finalTotal - historicalPenalty;

    // 6. Validación de Estado
    const balanceDue = record.status === 'paid' ? 0 : Math.max(0, grandTotal - totalPaid);
    const isFullyPaid = record.status === 'paid' || balanceDue < 0.01;

    // 7. Configuración de Texto de Concepto
    let conceptDisplay = record.concept;
    if (historicalPenalty > 0) {
        conceptDisplay += ` (Base: ${formatMoney(baseAmount)} + Recargo: ${formatMoney(historicalPenalty)})`;
    }

    doc.setFont('helvetica');

    // --- 1. ENCABEZADO CENTRADO ---
    let currentY = 25;
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colorRedIKC[0], colorRedIKC[1], colorRedIKC[2]);
    doc.text(academy.name.toUpperCase(), centerX, currentY, { align: 'center' });

    currentY += 10;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colorTextMuted[0], colorTextMuted[1], colorTextMuted[2]);
    
    // FIX: Centrado absoluto.
    doc.text('COMPROBANTE DIGITAL DE MOVIMIENTO', centerX, currentY, { align: 'center' });

    // --- 2. HERO SECTION (MONTO Y BADGE) ---
    currentY += 25;
    doc.setFontSize(10);
    doc.setTextColor(colorTextMuted[0], colorTextMuted[1], colorTextMuted[2]);
    doc.text('MONTO TOTAL ABONADO', centerX, currentY, { align: 'center' });

    currentY += 14;
    doc.setFontSize(40);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colorTextMain[0], colorTextMain[1], colorTextMain[2]);
    doc.text(formatMoney(totalPaid), centerX, currentY, { align: 'center' });

    // Badge de Estado (Estilo Soft/Glass)
    currentY += 12;
    const statusText = isFullyPaid ? 'PAGO COMPLETADO' : 'PAGO PARCIAL - SALDO PENDIENTE';
    const bgCol = isFullyPaid ? colorSuccessBG : colorPendingBG;
    const txtCol = isFullyPaid ? colorSuccessText : colorPendingText;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const textWidth = doc.getTextWidth(statusText);
    
    // Dibujar fondo del badge (rectángulo redondeado suave)
    doc.setFillColor(bgCol[0], bgCol[1], bgCol[2]);
    doc.roundedRect(centerX - (textWidth/2) - 6, currentY - 4.5, textWidth + 12, 7.5, 1.5, 1.5, 'F');
    
    // Texto del badge
    doc.setTextColor(txtCol[0], txtCol[1], txtCol[2]);
    doc.text(statusText, centerX, currentY + 1, { align: 'center' });

    // --- 3. SECCIÓN DE INFORMACIÓN ---
    currentY += 25;
    doc.setDrawColor(colorRedIKC[0], colorRedIKC[1], colorRedIKC[2]);
    doc.setLineWidth(0.6);
    doc.line(centerX - 10, currentY, centerX + 10, currentY); // Línea de acento central

    currentY += 12;
    const drawInfoRow = (label: string, value: string, x: number, y: number, align: 'left' | 'center' | 'right' = 'left') => {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(colorTextMuted[0], colorTextMuted[1], colorTextMuted[2]);
        doc.text(label.toUpperCase(), x, y, { align });
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(colorTextMain[0], colorTextMain[1], colorTextMain[2]);
        doc.text(value, x, y + 6, { align });
    };

    drawInfoRow('Alumno', record.studentName || 'No registrado', margin, currentY);
    // Usamos conceptDisplay que incluye el desglose visual si hay recargo
    drawInfoRow('Concepto', conceptDisplay, centerX, currentY, 'center');
    drawInfoRow('Fecha Emisión', new Date().toLocaleDateString('es-MX'), pageWidth - margin, currentY, 'right');

    currentY += 18;
    drawInfoRow('Folio', `#${record.id.split('-').pop()?.toUpperCase()}`, margin, currentY);
    drawInfoRow('Método de Pago', record.method || 'Transferencia', centerX, currentY, 'center');
    drawInfoRow('Vencimiento', formatDate(record.dueDate), pageWidth - margin, currentY, 'right');

    // --- 4. TABLA DE DESGLOSE (ESTILO STRIPE) ---
    currentY += 22;
    
    const tableBody: any[][] = [
        [
            { content: record.concept, styles: { fontStyle: 'bold' } },
            '1',
            formatMoney(baseAmount) // Usamos baseAmount derivado, no originalAmount
        ]
    ];

    if (historicalPenalty > 0) {
        tableBody.push([{ content: 'Recargo por pago tardío', styles: { textColor: [220, 38, 38] } }, '1', formatMoney(historicalPenalty)]);
    }

    autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [['DESCRIPCIÓN', 'CANTIDAD', 'SUBTOTAL']],
        body: tableBody,
        theme: 'plain',
        headStyles: {
            fillColor: [255, 255, 255],
            textColor: colorTextMuted,
            fontStyle: 'bold',
            fontSize: 8,
            lineWidth: { bottom: 0.1 },
            lineColor: [229, 231, 235]
        },
        bodyStyles: {
            fontSize: 9,
            cellPadding: 6,
            textColor: colorTextMain
        },
        columnStyles: {
            2: { halign: 'right' }
        }
    });

    // --- 5. RESUMEN FINAL ---
    let finalY = (doc as any).lastAutoTable.finalY + 12;
    
    // FIX: Se mueve summaryX más a la izquierda (-90) para dar más separación entre texto y número
    const summaryX = pageWidth - margin - 90; 

    const drawSummaryLine = (label: string, value: string, isTotal = false, isBlack = false) => {
        doc.setFontSize(isTotal ? 12 : 9);
        doc.setFont('helvetica', isTotal ? 'bold' : 'normal');
        
        // Color del label
        doc.setTextColor(isTotal || isBlack ? colorTextMain[0] : colorTextMuted[0]);
        doc.text(label, summaryX, finalY);
        
        // Color del valor (siempre negro/main según petición)
        doc.setTextColor(colorTextMain[0]);
        doc.text(value, pageWidth - margin, finalY, { align: 'right' });
        finalY += isTotal ? 10 : 7;
    };

    // Desglose explícito calculado
    drawSummaryLine('Monto original:', formatMoney(baseAmount));
    if (historicalPenalty > 0) {
        drawSummaryLine('Recargo aplicado:', `+${formatMoney(historicalPenalty)}`);
    }
    
    // Subtotal antes de pagos
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.1);
    doc.line(summaryX, finalY - 3, pageWidth - margin, finalY - 3);
    finalY += 4;
    
    // Total generado (Base + Recargo)
    drawSummaryLine('Cargo total generado:', formatMoney(finalTotal), false, true);
    drawSummaryLine('Abono registrado:', `-${formatMoney(totalPaid)}`);
    
    // Separador final
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.1);
    doc.line(summaryX, finalY - 3, pageWidth - margin, finalY - 3);
    finalY += 6;

    const balanceLabel = isFullyPaid ? 'ESTADO FINAL:' : 'RESTANTE POR PAGAR:';
    const balanceValue = isFullyPaid ? 'LIQUIDADO' : formatMoney(balanceDue);
    
    // El valor final ahora es negro y tiene más espacio respecto al label
    drawSummaryLine(balanceLabel, balanceValue, true);

    // --- 6. PIE DE PÁGINA LEGAL ---
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(156, 163, 175);
    const footerText = 'Este documento es un comprobante de operación interna generado por Pulse Management para IKC.';
    doc.text(footerText, centerX, pageHeight - 15, { align: 'center' });

    // --- GENERAR PDF ---
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
};
