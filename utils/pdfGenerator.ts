
import { TuitionRecord, AcademySettings, UserProfile } from '../types';

interface ReceiptContext {
    paymentStatus: 'partial' | 'completed';
    paymentHistory?: { date: string; amount: number; method?: string }[]; // Historial previo
    currentPaymentAmount?: number; // El monto exacto pagado en ESTA transacción
}

export const generateReceipt = (
    record: TuitionRecord, 
    academy: AcademySettings, 
    user?: UserProfile | null,
    context?: ReceiptContext
) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Por favor habilita los pop-ups para generar el recibo.");
        return;
    }

    // --- 1. DATA PREPARATION ---

    // Determinar estado (Prioridad: Contexto explicito > Estado del registro)
    const status = context?.paymentStatus || (record.status === 'partial' ? 'partial' : 'completed');
    const isPartial = status === 'partial';

    // Fechas
    const dateToUse = record.paymentDate || new Date().toISOString();
    const displayDate = new Date(dateToUse).toLocaleDateString('es-MX', { 
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });

    // Valores Monetarios
    const totalConceptCost = record.originalAmount !== undefined ? record.originalAmount : record.amount;
    
    // El monto pagado HOY. Si viene en el contexto, úsalo. Si no, usa declaredAmount. Si no, asume total (caso legacy).
    let amountPaidToday = 0;
    if (context?.currentPaymentAmount !== undefined) {
        amountPaidToday = context.currentPaymentAmount;
    } else if (record.declaredAmount !== undefined) {
        amountPaidToday = record.declaredAmount;
    } else {
        // Fallback para registros antiguos
        amountPaidToday = isPartial ? (totalConceptCost - record.amount) : totalConceptCost; 
    }

    // Saldo Restante (Solo relevante para parciales)
    // Si es parcial, el record.amount actual en la DB debería ser el restante, 
    // pero calculémoslo matemáticamente para consistencia visual en el recibo.
    const previousPaidSum = context?.paymentHistory?.reduce((sum, p) => sum + p.amount, 0) || 0;
    
    // Cálculo seguro del restante: Costo Total - (Lo pagado antes + Lo pagado hoy)
    const remainingBalance = Math.max(0, totalConceptCost - (previousPaidSum + amountPaidToday));

    // Textos Dinámicos
    const titleText = isPartial ? 'RECIBO DE ABONO' : 'RECIBO DE PAGO';
    const statusColor = isPartial ? '#f59e0b' : '#10b981'; // Orange vs Green
    const statusLabel = isPartial ? 'Parcialidad' : 'Liquidado';

    // --- 2. HTML GENERATION PARTS ---

    // Sección Central: Desglose Financiero
    let financialBody = '';

    if (isPartial) {
        // MODO ABONO
        financialBody = `
            <tr class="highlight-row">
                <td style="padding-top: 20px;">
                    <span class="concept-title">${record.concept}</span>
                    <div class="concept-subtitle">Monto Total del Concepto</div>
                </td>
                <td style="text-align: right; vertical-align: bottom; padding-top: 20px;">
                    <span class="concept-amount">$${totalConceptCost.toFixed(2)}</span>
                </td>
            </tr>
            <tr>
                <td style="padding-top: 10px; border-bottom: 1px dashed #eee; padding-bottom: 10px;">
                    <span style="font-weight: 600; color: #111;">Abono Realizado Hoy</span>
                </td>
                <td style="text-align: right; padding-top: 10px; border-bottom: 1px dashed #eee; padding-bottom: 10px;">
                    <span style="font-weight: 700; color: #111;">$${amountPaidToday.toFixed(2)}</span>
                </td>
            </tr>
            <tr>
                <td style="padding-top: 10px;">
                    <span style="font-weight: 600; color: #666;">Saldo Restante por Pagar</span>
                </td>
                <td style="text-align: right; padding-top: 10px;">
                    <span style="font-weight: 700; color: #f59e0b;">$${remainingBalance.toFixed(2)}</span>
                </td>
            </tr>
        `;
    } else {
        // MODO LIQUIDACIÓN / TOTAL
        financialBody = `
            <tr class="highlight-row">
                <td style="padding-top: 20px; padding-bottom: 20px; border-bottom: 2px solid #f5f5f7;">
                    <span class="concept-title">${record.concept}</span>
                    <div class="concept-subtitle">${record.category || 'General'}</div>
                </td>
                <td style="text-align: right; vertical-align: middle; padding-top: 20px; padding-bottom: 20px; border-bottom: 2px solid #f5f5f7;">
                    <span class="total-big">$${amountPaidToday.toFixed(2)}</span>
                    <div class="concept-subtitle" style="text-align: right;">Total Pagado Hoy</div>
                </td>
            </tr>
        `;
    }

    // Sección Inferior: Historial (Solo si es liquidación y hubo pagos previos)
    let historyHtml = '';
    const fullHistory = context?.paymentHistory ? [...context.paymentHistory] : [];
    
    // Si estamos en liquidación, agregamos el pago de hoy al historial visual para que se vea completo
    if (!isPartial && fullHistory.length > 0) {
        fullHistory.push({
            date: dateToUse,
            amount: amountPaidToday,
            method: record.method || 'Pago Final'
        });

        const historyRows = fullHistory.map(h => `
            <tr>
                <td>${new Date(h.date).toLocaleDateString('es-MX')}</td>
                <td>${h.method || '-'}</td>
                <td style="text-align: right;">$${h.amount.toFixed(2)}</td>
            </tr>
        `).join('');

        historyHtml = `
            <div class="history-container">
                <h3>Historial de Pagos (Liquidación Completa)</h3>
                <table class="history-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Método</th>
                            <th style="text-align: right;">Monto</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${historyRows}
                        <tr style="border-top: 2px solid #eee;">
                            <td colspan="2" style="text-align: right; font-weight: 800; padding-top: 10px;">Total Cubierto</td>
                            <td style="text-align: right; font-weight: 800; padding-top: 10px;">$${totalConceptCost.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    // --- 3. TEMPLATE ASSEMBLY ---

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Recibo ${record.id}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
            
            body { 
                font-family: 'Inter', sans-serif; 
                background: #f3f4f6; 
                padding: 40px 0; 
                margin: 0;
                color: #1f2937;
                -webkit-print-color-adjust: exact; 
            }
            .container {
                max-width: 700px;
                margin: 0 auto;
                background: white;
                padding: 0;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
                border-radius: 24px;
                overflow: hidden;
            }
            @media print {
                body { background: white; padding: 0; }
                .container { box-shadow: none; max-width: 100%; border-radius: 0; }
            }
            
            /* HEADER BRANDING */
            .header { 
                background: #111827; 
                color: white; 
                padding: 40px; 
                display: flex; 
                justify-content: space-between; 
                align-items: center;
            }
            .brand h1 { margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px; }
            .brand p { margin: 5px 0 0; font-size: 14px; opacity: 0.8; }
            
            .receipt-tag {
                text-align: right;
            }
            .receipt-title { 
                font-size: 12px; 
                font-weight: 700; 
                letter-spacing: 2px; 
                opacity: 0.6; 
                margin-bottom: 5px;
            }
            .receipt-id { font-size: 16px; font-family: monospace; font-weight: 500; opacity: 0.9; }

            /* INFO GRID */
            .info-bar {
                display: grid;
                grid-template-columns: 1fr 1fr;
                padding: 30px 40px;
                background: #f9fafb;
                border-bottom: 1px solid #e5e7eb;
            }
            .info-group label { display: block; font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; margin-bottom: 4px; }
            .info-group div { font-size: 15px; font-weight: 600; color: #111; }
            
            /* MAIN CONTENT */
            .content { padding: 40px; }
            
            .concept-title { font-size: 18px; font-weight: 800; color: #111; display: block; }
            .concept-subtitle { font-size: 13px; color: #6b7280; margin-top: 4px; }
            .concept-amount { font-size: 18px; font-weight: 500; color: #374151; }
            .total-big { font-size: 32px; font-weight: 900; color: #111; letter-spacing: -1px; }

            table { width: 100%; border-collapse: collapse; }
            
            /* HISTORY SECTION */
            .history-container {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 2px dashed #e5e7eb;
            }
            .history-container h3 { font-size: 12px; text-transform: uppercase; color: #9ca3af; margin-bottom: 15px; letter-spacing: 1px; }
            .history-table th { text-align: left; font-size: 11px; color: #9ca3af; padding-bottom: 8px; text-transform: uppercase; }
            .history-table td { font-size: 13px; color: #4b5563; padding: 6px 0; border-bottom: 1px solid #f3f4f6; }

            /* FOOTER */
            .footer {
                background: #f9fafb;
                padding: 30px 40px;
                border-top: 1px solid #e5e7eb;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .status-pill {
                background: ${statusColor};
                color: white;
                padding: 6px 16px;
                border-radius: 99px;
                font-size: 12px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .issuer { font-size: 12px; color: #9ca3af; font-weight: 500; }

        </style>
    </head>
    <body>
        <div class="container">
            <!-- Header -->
            <div class="header">
                <div class="brand">
                    <h1>${academy.name || 'Academy Pro'}</h1>
                    <p>${academy.code}</p>
                </div>
                <div class="receipt-tag">
                    <div class="receipt-title">${titleText}</div>
                    <div class="receipt-id">#${record.id.split('-').pop()?.toUpperCase() || 'REF'}</div>
                </div>
            </div>

            <!-- Student & Date Info -->
            <div class="info-bar">
                <div class="info-group">
                    <label>Alumno</label>
                    <div>${record.studentName}</div>
                    <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">ID: ${record.studentId}</div>
                </div>
                <div class="info-group" style="text-align: right;">
                    <label>Fecha de Emisión</label>
                    <div>${displayDate}</div>
                    <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">Método: ${record.method || 'Sistema'}</div>
                </div>
            </div>

            <!-- Main Financial Body -->
            <div class="content">
                <table>
                    <tbody>
                        ${financialBody}
                    </tbody>
                </table>

                ${historyHtml}
            </div>

            <!-- Footer -->
            <div class="footer">
                <div class="status-pill">${statusLabel}</div>
                <div class="issuer">
                    Emitido por: ${user?.name || 'Sistema Automático'} <br>
                    ${academy.name}
                </div>
            </div>
        </div>
        <script>
            window.onload = function() { window.print(); }
        </script>
    </body>
    </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
};
