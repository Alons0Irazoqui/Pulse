
import { TuitionRecord, AcademySettings, UserProfile } from '../types';

export const generateReceipt = (payment: TuitionRecord, academy: AcademySettings, user?: UserProfile | null) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Por favor habilita los pop-ups para generar el recibo.");
        return;
    }

    // CRITICAL FIX: Manually parse date string YYYY-MM-DD to avoid UTC shift
    // Handle both paymentDate (ISO timestamp) and dueDate (YYYY-MM-DD)
    const dateToUse = payment.paymentDate || payment.dueDate;
    const localDate = new Date(dateToUse);
    const displayDate = localDate.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

    // --- LOGIC FOR DYNAMIC DETAILS & TOTALS ---
    let lineItemsHtml = '';
    let calculatedTotal = 0;

    if (payment.details && payment.details.length > 0) {
        // Scenario A: Payment has explicit breakdown (New Architecture)
        lineItemsHtml = payment.details.map(item => `
            <tr>
                <td>
                    <span style="font-weight: 600;">${item.description}</span>
                </td>
                <td>${payment.category || 'Varios'}</td>
                <td>$${item.amount.toFixed(2)}</td>
            </tr>
        `).join('');
        
        calculatedTotal = payment.details.reduce((sum, item) => sum + item.amount, 0);
    } else {
        // Scenario B: Legacy Record or Single Payment without details
        
        // QA UPDATE: Logic Hierarchy for Receipt Amount (Legal Consistency)
        // 1. declaredAmount: HIGHEST PRIORITY. Represents the exact amount validated/adjusted by the Master (Single Source of Truth).
        // 2. originalAmount: Fallback for historical paid records.
        // 3. amount: Fallback to current debt value if pending.
        const displayAmount = payment.declaredAmount !== undefined
            ? payment.declaredAmount 
            : (payment.originalAmount !== undefined && payment.originalAmount > 0 ? payment.originalAmount : payment.amount);

        lineItemsHtml = `
            <tr>
                <td>
                    <span style="font-weight: 600;">${payment.concept || payment.description || 'Pago de servicios'}</span>
                </td>
                <td>${payment.category || 'General'}</td>
                <td>$${displayAmount.toFixed(2)}</td>
            </tr>
        `;
        calculatedTotal = displayAmount;
    }

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Recibo #${payment.id.slice(-6).toUpperCase()}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
            
            body { 
                font-family: 'Inter', sans-serif; 
                background: #f5f5f7; 
                padding: 40px 0; 
                margin: 0;
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact;
            }
            .container {
                max-width: 700px;
                margin: 0 auto;
                background: white;
                padding: 60px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.05);
                border-radius: 12px;
            }
            @media print {
                body { background: white; padding: 0; }
                .container { box-shadow: none; padding: 0; max-width: 100%; }
            }
            
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 60px; }
            .brand h1 { margin: 0; font-size: 24px; font-weight: 800; color: #111; letter-spacing: -0.5px; }
            .brand p { margin: 4px 0 0; color: #666; font-size: 14px; }
            
            .meta { text-align: right; }
            .meta h2 { margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #999; font-weight: 600; }
            .meta p { margin: 4px 0 0; font-size: 14px; font-weight: 600; color: #111; }
            .status-badge { 
                display: inline-block; 
                margin-top: 12px; 
                padding: 4px 12px; 
                border-radius: 99px; 
                background: #ecfdf5; 
                color: #059669; 
                font-size: 11px; 
                font-weight: 700; 
                text-transform: uppercase; 
                letter-spacing: 0.5px;
            }

            .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 40px; margin-bottom: 60px; }
            .info-col h3 { font-size: 11px; text-transform: uppercase; color: #999; margin: 0 0 8px 0; letter-spacing: 0.5px; }
            .info-col p { margin: 0; font-size: 15px; color: #111; font-weight: 500; }

            .line-items { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
            .line-items th { text-align: left; font-size: 11px; text-transform: uppercase; color: #999; padding-bottom: 16px; border-bottom: 1px solid #eee; }
            .line-items td { padding: 16px 0; border-bottom: 1px solid #eee; color: #111; font-size: 15px; }
            .line-items td:last-child, .line-items th:last-child { text-align: right; }
            
            .total-section { display: flex; justify-content: flex-end; margin-top: 20px; }
            .total-box { text-align: right; }
            .total-label { font-size: 12px; color: #666; margin-bottom: 4px; }
            .total-amount { font-size: 32px; font-weight: 800; color: #111; letter-spacing: -1px; }

            .footer { margin-top: 80px; padding-top: 30px; border-top: 1px solid #f5f5f7; text-align: center; color: #999; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="brand">
                    <h1>${academy.name || 'Academy Pro'}</h1>
                    <p>${academy.code}</p>
                </div>
                <div class="meta">
                    <h2>Recibo de Pago</h2>
                    <p>#${payment.id.slice(-8).toUpperCase()}</p>
                    <div class="status-badge">Pagado</div>
                </div>
            </div>

            <div class="info-grid">
                <div class="info-col">
                    <h3>Facturado a</h3>
                    <p>${payment.studentName}</p>
                    <p style="font-size: 13px; color: #666; margin-top: 4px;">ID: ${payment.studentId}</p>
                </div>
                <div class="info-col" style="text-align: right;">
                    <h3>Detalles</h3>
                    <p>Fecha: ${displayDate}</p>
                    <p>Método: ${payment.method || 'No especificado'}</p>
                </div>
            </div>

            <table class="line-items">
                <thead>
                    <tr>
                        <th width="60%">Concepto / Descripción</th>
                        <th width="20%">Categoría</th>
                        <th width="20%">Importe</th>
                    </tr>
                </thead>
                <tbody>
                    ${lineItemsHtml}
                </tbody>
            </table>

            <div class="total-section">
                <div class="total-box">
                    <div class="total-label">Total Pagado</div>
                    <div class="total-amount">$${calculatedTotal.toFixed(2)}</div>
                </div>
            </div>

            <div class="footer">
                <p>Gracias por tu pago. Este recibo fue generado digitalmente por Academy Pro.</p>
                <p style="margin-top: 5px;">${user?.name ? 'Emitido por: ' + user.name : ''}</p>
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
