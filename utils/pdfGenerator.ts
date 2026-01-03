import { Payment, AcademySettings, UserProfile } from '../types';

export const generateReceipt = (payment: Payment, academy: AcademySettings, user?: UserProfile | null) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Por favor habilita los pop-ups para generar el recibo.");
        return;
    }

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Recibo #${payment.id}</title>
        <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 40px; }
            .logo { font-size: 24px; font-weight: bold; color: #0d59f2; }
            .invoice-details { text-align: right; }
            .invoice-details h1 { margin: 0; font-size: 18px; color: #888; text-transform: uppercase; }
            .status { color: ${payment.status === 'paid' ? '#10B981' : '#F59E0B'}; font-weight: bold; text-transform: uppercase; border: 2px solid currentColor; padding: 5px 10px; display: inline-block; transform: rotate(-5deg); margin-top: 10px; }
            .content { margin-bottom: 40px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .label { font-weight: bold; color: #666; }
            .amount-row { font-size: 24px; border-top: 2px solid #333; padding-top: 10px; margin-top: 20px; }
            .footer { text-align: center; font-size: 12px; color: #aaa; margin-top: 80px; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
    </head>
    <body>
        <div class="header">
            <div>
                <div class="logo">${academy.name}</div>
                <p>${academy.code}</p>
                <p>Emisor: ${user?.name || 'Administración'}</p>
            </div>
            <div class="invoice-details">
                <h1>Recibo de Pago</h1>
                <p>#${payment.id}</p>
                <p>${new Date(payment.date).toLocaleDateString()}</p>
                <div class="status">${payment.status === 'paid' ? 'PAGADO' : 'PENDIENTE'}</div>
            </div>
        </div>

        <div class="content">
            <div class="row">
                <span class="label">Alumno:</span>
                <span>${payment.studentName}</span>
            </div>
            <div class="row">
                <span class="label">Concepto:</span>
                <span>${payment.description}</span>
            </div>
            <div class="row">
                <span class="label">Método:</span>
                <span>${payment.method}</span>
            </div>
            <div class="row">
                <span class="label">Categoría:</span>
                <span>${payment.category}</span>
            </div>
            
            <div class="row amount-row">
                <span class="label">Total:</span>
                <span>$${payment.amount.toFixed(2)} MXN</span>
            </div>
        </div>

        <div class="footer">
            <p>Gracias por entrenar con nosotros. Este es un comprobante generado digitalmente por Pulse Academy Manager.</p>
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