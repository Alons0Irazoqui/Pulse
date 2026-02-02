
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
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Por favor habilita los pop-ups para generar el recibo.");
        return;
    }

    // --- 1. LOGIC ENGINE ---

    let history: PaymentHistoryItem[] = [];
    let currentPaymentAmount = 0;
    let previousPaid = 0;
    
    const baseAmount = record.originalAmount !== undefined ? record.originalAmount : record.amount;
    const totalCost = baseAmount + (record.penaltyAmount || 0);

    // Visual breakdown
    const displayedPenalty = (record.customPenaltyAmount && record.customPenaltyAmount > 0)
        ? record.customPenaltyAmount
        : (record.penaltyAmount || 0);

    const displayBase = totalCost - displayedPenalty;

    if (options && options.currentPaymentAmount !== undefined) {
        // Just Paid Context
        currentPaymentAmount = options.currentPaymentAmount;
        const prevHistory = options.paymentHistory || []; 
        previousPaid = prevHistory.reduce((sum, h) => sum + h.amount, 0);
        
        history = [
            ...prevHistory,
            {
                date: new Date().toISOString(),
                amount: currentPaymentAmount,
                method: record.method || 'Sistema'
            }
        ];
    } else {
        // History Context
        history = (record.paymentHistory || []).slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        if (history.length > 0) {
            const lastItem = history[history.length - 1];
            currentPaymentAmount = lastItem.amount;
            const prevItems = history.slice(0, history.length - 1);
            previousPaid = prevItems.reduce((sum, h) => sum + h.amount, 0);
        } else if (record.status === 'paid' || record.status === 'partial') {
            if (record.status === 'paid') {
                currentPaymentAmount = totalCost;
                previousPaid = 0;
            } else {
                const paidSoFar = totalCost - (record.amount + (record.penaltyAmount || 0));
                currentPaymentAmount = paidSoFar;
                previousPaid = 0;
            }
            history = [{
                date: record.paymentDate || new Date().toISOString(),
                amount: currentPaymentAmount,
                method: record.method || 'Sistema'
            }];
        }
    }

    const totalPaid = previousPaid + currentPaymentAmount;
    const remainingBalance = Math.max(0, totalCost - totalPaid);

    // --- 2. DISPLAY LOGIC ---

    const isLiquidation = remainingBalance < 0.01;
    
    const statusLabel = isLiquidation ? 'COMPLETADO' : 'PARCIAL';
    const statusBg = isLiquidation ? '#ecfdf5' : '#fffbeb';
    const statusBorder = isLiquidation ? '#059669' : '#d97706';

    const dateToUse = history.length > 0 ? history[history.length - 1].date : new Date().toISOString();
    const displayDate = new Date(dateToUse).toLocaleDateString('es-MX', { 
        year: 'numeric', month: 'long', day: 'numeric'
    }).toUpperCase();

    const safeConcept = record.concept.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const fileName = `Recibo_${safeConcept}`;

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
    };

    const historyRows = history.map(h => `
        <tr class="item-row">
            <td style="color: #6b7280;">${new Date(h.date).toLocaleDateString('es-MX')}</td>
            <td style="color: #374151;">${h.method || 'Sistema'}</td>
            <td class="text-right" style="color: #111827;">${formatMoney(h.amount)}</td>
        </tr>
    `).join('');

    // --- 3. HTML STRUCTURE ---

    const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>${fileName}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;800&display=swap');
            
            body {
                font-family: 'Inter', sans-serif;
                background-color: #525659;
                margin: 0;
                padding: 40px 0;
                -webkit-print-color-adjust: exact;
            }

            .page {
                background: white;
                width: 210mm;
                min-height: 297mm;
                margin: 0 auto;
                padding: 40px 50px;
                box-sizing: border-box;
                box-shadow: 0 0 20px rgba(0,0,0,0.2);
                position: relative;
            }

            @media print {
                body { background: none; padding: 0; }
                .page { width: 100%; height: 100%; box-shadow: none; margin: 0; padding: 30px 40px; }
            }

            .text-right { text-align: right; }
            
            .header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 50px;
                border-bottom: 2px solid #f3f4f6;
                padding-bottom: 30px;
            }

            .brand-section h1 {
                margin: 0;
                font-size: 24px;
                font-weight: 800;
                color: #111827;
                letter-spacing: -0.5px;
            }
            
            .brand-section .subtitle {
                margin-top: 4px;
                font-size: 12px;
                color: #f97316;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .receipt-meta {
                text-align: right;
            }

            .meta-label {
                font-size: 10px;
                font-weight: 700;
                color: #9ca3af;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .meta-value {
                font-size: 14px;
                font-weight: 600;
                color: #111827;
                margin-bottom: 12px;
            }

            .status-badge {
                display: inline-block;
                padding: 6px 16px;
                border: 2px solid ${statusBorder};
                background-color: ${statusBg};
                color: ${statusBorder};
                font-size: 12px;
                font-weight: 800;
                border-radius: 6px;
                text-transform: uppercase;
                letter-spacing: 1px;
                transform: rotate(-2deg);
                margin-top: 10px;
            }

            .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 40px;
                margin-bottom: 50px;
            }

            .info-block h3 {
                font-size: 11px;
                text-transform: uppercase;
                color: #9ca3af;
                margin-bottom: 8px;
                font-weight: 700;
            }

            .info-block p {
                margin: 0;
                font-size: 14px;
                color: #1f2937;
                font-weight: 500;
            }

            .concept-detail {
                font-size: 12px;
                color: #6b7280;
                margin-top: 4px;
            }

            table { width: 100%; border-collapse: collapse; }
            th {
                text-align: left;
                font-size: 10px;
                text-transform: uppercase;
                color: #6b7280;
                font-weight: 700;
                padding: 12px 0;
                border-bottom: 1px solid #e5e7eb;
            }
            
            .main-row td {
                padding: 20px 0;
                font-size: 15px;
                font-weight: 600;
                color: #111827;
                border-bottom: 1px solid #f3f4f6;
            }

            .summary-section {
                display: flex;
                justify-content: flex-end;
                margin-top: 20px;
            }

            .summary-table { width: 300px; }

            .summary-row {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                font-size: 13px;
                color: #4b5563;
            }

            .summary-row.total {
                border-top: 2px solid #e5e7eb;
                margin-top: 8px;
                padding-top: 15px;
                font-size: 16px;
                font-weight: 800;
                color: #111827;
            }

            .summary-row.paid { color: #10b981; font-weight: 600; }
            .summary-row.balance { color: ${remainingBalance > 0 ? '#ef4444' : '#9ca3af'}; font-weight: 700; }

            .history-section { margin-top: 60px; }
            .history-title {
                font-size: 11px;
                font-weight: 700;
                color: #9ca3af;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 1px solid #f3f4f6;
            }
            .item-row td {
                padding: 10px 0;
                font-size: 13px;
                border-bottom: 1px dashed #f3f4f6;
            }

            .footer {
                position: absolute;
                bottom: 40px;
                left: 50px;
                right: 50px;
                text-align: center;
                border-top: 1px solid #f3f4f6;
                padding-top: 20px;
            }
            .footer p { margin: 0; font-size: 11px; color: #9ca3af; }
            .footer strong { color: #1f2937; }
        </style>
    </head>
    <body>
        <div class="page">
            <div class="header">
                <div class="brand-section">
                    <h1>${academy.name || 'Academy Pro'}</h1>
                    <div class="subtitle">Comprobante de Pago</div>
                    <div style="margin-top: 15px; font-size: 12px; color: #4b5563; line-height: 1.4;">
                        ${academy.code}<br>
                        Emitido por: ${user?.name || 'Administración'}
                    </div>
                </div>
                <div class="receipt-meta">
                    <div class="meta-group">
                        <div class="meta-label">Folio</div>
                        <div class="meta-value">#${record.id.split('-').pop()?.toUpperCase() || 'REF'}</div>
                    </div>
                    <div class="meta-group">
                        <div class="meta-label">Fecha</div>
                        <div class="meta-value">${displayDate}</div>
                    </div>
                    <div class="status-badge">${statusLabel}</div>
                </div>
            </div>

            <div class="info-grid">
                <div class="info-block">
                    <h3>Alumno</h3>
                    <p>${record.studentName}</p>
                </div>
                <div class="info-block">
                    <h3>Concepto</h3>
                    <p>${record.concept}</p>
                    <div class="concept-detail">${record.description || ''}</div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 20%;">Fecha</th>
                        <th style="width: 20%;">Método</th>
                        <th class="text-right">Monto</th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="main-row">
                        <td>${displayDate}</td>
                        <td>${record.method || 'Sistema'}</td>
                        <td class="text-right">${formatMoney(totalCost)}</td>
                    </tr>
                </tbody>
            </table>

            <div class="summary-section">
                <div class="summary-table">
                    <div class="summary-row">
                        <span>Subtotal</span>
                        <span>${formatMoney(displayBase)}</span>
                    </div>
                    ${displayedPenalty > 0 ? `
                    <div class="summary-row">
                        <span>Recargos</span>
                        <span>${formatMoney(displayedPenalty)}</span>
                    </div>
                    ` : ''}
                    <div class="summary-row total">
                        <span>Total</span>
                        <span>${formatMoney(totalCost)}</span>
                    </div>
                    <div class="summary-row paid">
                        <span>Pagado</span>
                        <span>${formatMoney(totalPaid)}</span>
                    </div>
                    <div class="summary-row balance">
                        <span>Pendiente</span>
                        <span>${formatMoney(remainingBalance)}</span>
                    </div>
                </div>
            </div>

            ${history.length > 1 ? `
            <div class="history-section">
                <div class="history-title">Historial de Pagos</div>
                <table>
                    ${historyRows}
                </table>
            </div>
            ` : ''}

            <div class="footer">
                <p>Gracias por tu pago. Este documento sirve como comprobante oficial.</p>
                <p><strong>${academy.name}</strong></p>
            </div>
        </div>
    </body>
    </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
};
