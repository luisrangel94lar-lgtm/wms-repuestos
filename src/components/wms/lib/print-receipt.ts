interface ReceiptData {
  warehouseName: string
  warehouseAddress: string
  warehousePhone: string
  folio: string
  fecha: string
  cliente: { nombre: string; telefono: string | null }
  detalles: {
    producto?: { nombre: string; sku: string } | null
    cantidad: number
    precioUnitario: number
  }[]
  subtotal: number
  total: number
  estado: string
}

export function generateReceiptHtml(data: ReceiptData): string {
  const itemsHtml = data.detalles
    .map(
      (d, i) => `
      <tr class="item-row">
        <td class="text-center">${i + 1}</td>
        <td>${d.producto?.nombre ?? 'N/A'}</td>
        <td class="text-center">${d.cantidad}</td>
        <td class="text-right">$${d.precioUnitario.toFixed(2)}</td>
        <td class="text-right">$${(d.cantidad * d.precioUnitario).toFixed(2)}</td>
      </tr>`
    )
    .join('')

  const now = new Date()
  const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Recibo ${data.folio}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      line-height: 1.5;
      color: #000;
      width: 80mm;
      margin: 0 auto;
      padding: 8mm;
      background: #fff;
    }
    .receipt {
      border: 1px solid #333;
      padding: 4mm;
    }
    .header {
      text-align: center;
      border-bottom: 2px dashed #333;
      padding-bottom: 8px;
      margin-bottom: 8px;
    }
    .header h1 {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 2px;
    }
    .header p {
      font-size: 10px;
      color: #333;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px;
      margin-bottom: 8px;
      font-size: 11px;
    }
    .info-grid .label {
      color: #555;
    }
    .info-grid .value {
      font-weight: bold;
      text-align: right;
    }
    .client-section {
      border: 1px solid #999;
      padding: 6px;
      margin-bottom: 8px;
      border-radius: 2px;
    }
    .client-section .title {
      font-size: 10px;
      text-transform: uppercase;
      border-bottom: 1px solid #ccc;
      padding-bottom: 2px;
      margin-bottom: 4px;
      color: #555;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin-bottom: 8px;
    }
    thead {
      border-bottom: 1px solid #333;
    }
    th {
      font-size: 10px;
      text-transform: uppercase;
      padding: 4px 2px;
      text-align: left;
      font-weight: bold;
      color: #333;
    }
    th.text-center { text-align: center; }
    th.text-right { text-align: right; }
    td {
      padding: 3px 2px;
      vertical-align: top;
    }
    td.text-center { text-align: center; }
    td.text-right { text-align: right; }
    .item-row:nth-child(even) {
      background: #f5f5f5;
    }
    .totals {
      border-top: 2px solid #333;
      padding-top: 6px;
      margin-top: 4px;
    }
    .totals .row {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      padding: 2px 0;
    }
    .totals .total-row {
      font-size: 16px;
      font-weight: bold;
      border-top: 1px dashed #333;
      padding-top: 4px;
      margin-top: 4px;
    }
    .footer {
      text-align: center;
      border-top: 2px dashed #333;
      margin-top: 10px;
      padding-top: 8px;
    }
    .footer p {
      font-size: 9px;
      color: #777;
      margin-bottom: 2px;
    }
    .estado-badge {
      display: inline-block;
      padding: 1px 8px;
      border: 1px solid #333;
      font-weight: bold;
      font-size: 10px;
    }
    @media print {
      body {
        width: 80mm;
        margin: 0;
        padding: 4mm;
      }
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <h1>${data.warehouseName || 'Almacén'}</h1>
      ${data.warehouseAddress ? `<p>${data.warehouseAddress}</p>` : ''}
      ${data.warehousePhone ? `<p>Tel: ${data.warehousePhone}</p>` : ''}
    </div>

    <div class="info-grid">
      <span class="label">Folio:</span>
      <span class="value" style="text-align:right">${data.folio}</span>
      <span class="label">Fecha:</span>
      <span class="value" style="text-align:right">${data.fecha}</span>
      <span class="label">Estado:</span>
      <span class="value" style="text-align:right"><span class="estado-badge">${data.estado}</span></span>
    </div>

    <div class="client-section">
      <div class="title">Cliente</div>
      <p style="font-weight:bold;font-size:13px;">${data.cliente.nombre}</p>
      ${data.cliente.telefono ? `<p style="font-size:10px;color:#555;">Tel: ${data.cliente.telefono}</p>` : ''}
    </div>

    <table>
      <thead>
        <tr>
          <th class="text-center">#</th>
          <th>Producto</th>
          <th class="text-center">Cant.</th>
          <th class="text-right">Precio</th>
          <th class="text-right">Importe</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="totals">
      <div class="row">
        <span>Subtotal:</span>
        <span>$${(data.subtotal ?? data.total ?? 0).toFixed(2)}</span>
      </div>
      <div class="row total-row">
        <span>TOTAL:</span>
        <span>$${(data.total ?? 0).toFixed(2)}</span>
      </div>
    </div>

    <div class="footer">
      <p>Generado: ${dateStr} ${timeStr}</p>
      <p>WMS Repuestos v1.0</p>
      <p>*** Gracias por su compra ***</p>
    </div>
  </div>

  <div class="no-print" style="text-align:center;margin-top:12px;">
    <button onclick="window.print()" style="padding:8px 24px;font-size:14px;cursor:pointer;border:1px solid #333;background:#f5f5f5;">Imprimir</button>
  </div>
</body>
</html>`
}

export function printReceipt(data: ReceiptData): void {
  const html = generateReceiptHtml(data)
  const win = window.open('', '_blank', 'width=400,height=700')
  if (win) {
    win.document.write(html)
    win.document.close()
  }
}

export function getWarehouseSettings(): {
  name: string
  address: string
  phone: string
} {
  if (typeof window === 'undefined') return { name: '', address: '', phone: '' }
  try {
    const raw = localStorage.getItem('wms-settings')
    if (raw) {
      const settings = JSON.parse(raw)
      return {
        name: settings.warehouseName ?? '',
        address: settings.warehouseAddress ?? '',
        phone: settings.warehousePhone ?? '',
      }
    }
  } catch {
    // ignore
  }
  return { name: '', address: '', phone: '' }
}
