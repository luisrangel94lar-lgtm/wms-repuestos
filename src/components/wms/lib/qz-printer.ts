'use client'

import type { ReceiptData } from './print-receipt'

export interface QzPrinterSettings {
  printerName: string
  autoPrint: boolean
  openDrawer: boolean
}

const STORAGE_KEY = 'wms-qz-printer-settings-v1'

export function getQzPrinterSettings(): QzPrinterSettings {
  if (typeof window === 'undefined') return { printerName: '', autoPrint: false, openDrawer: false }
  try {
    return { printerName: '', autoPrint: false, openDrawer: false, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }
  } catch {
    return { printerName: '', autoPrint: false, openDrawer: false }
  }
}

export function saveQzPrinterSettings(settings: QzPrinterSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

async function qzClient(): Promise<any> {
  const importedQz = await import('qz-tray')
  return importedQz.default ?? importedQz
}

export async function connectQz() {
  const qz = await qzClient()
  if (!qz.websocket.isActive()) await qz.websocket.connect()
  return qz
}

export async function listQzPrinters(): Promise<string[]> {
  const qz = await connectQz()
  const result = await qz.printers.find()
  return Array.isArray(result) ? result : [result]
}

function clean(value: unknown) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E\n]/g, '')
}

function money(value: number) {
  return `$${Math.round(value).toLocaleString('es-CO')}`
}

function line(left: string, right: string, width = 42) {
  const safeLeft = clean(left).slice(0, Math.max(1, width - right.length - 1))
  return `${safeLeft}${' '.repeat(Math.max(1, width - safeLeft.length - right.length))}${right}\n`
}

export function buildEscPosReceipt(data: ReceiptData) {
  let output = '\x1B\x40\x1B\x61\x01'
  output += `\x1B\x45\x01${clean(data.warehouseName)}\x1B\x45\x00\n`
  if (data.warehouseAddress) output += `${clean(data.warehouseAddress)}\n`
  if (data.warehousePhone) output += `Tel: ${clean(data.warehousePhone)}\n`
  output += '------------------------------------------\n\x1B\x61\x00'
  output += `Venta: ${clean(data.folio)}\nFecha: ${clean(data.fecha)}\nCliente: ${clean(data.cliente.nombre)}\n`
  output += '------------------------------------------\n'
  for (const item of data.detalles) {
    output += `${clean(item.producto?.nombre ?? 'Producto')}\n`
    output += line(`${item.cantidad} x ${money(item.precioUnitario)}`, money(item.cantidad * item.precioUnitario))
  }
  output += '------------------------------------------\n'
  output += `\x1B\x45\x01${line('TOTAL', money(data.total))}\x1B\x45\x00`
  output += '\x1B\x61\x01Gracias por su compra\n\n\n\x1D\x56\x00'
  return output
}

async function rawPrint(printerName: string, data: string[]) {
  if (!printerName) throw new Error('Seleccione una impresora')
  const qz = await connectQz()
  const config = qz.configs.create(printerName, { encoding: 'CP850' })
  await qz.print(config, data.map(value => ({ type: 'raw', format: 'plain', data: value })))
}

export async function printQzReceipt(data: ReceiptData, printerName = getQzPrinterSettings().printerName, openDrawer = getQzPrinterSettings().openDrawer) {
  const payload = [buildEscPosReceipt(data)]
  if (openDrawer) payload.push('\x10\x14\x01\x00\x05')
  await rawPrint(printerName, payload)
}

export async function testQzPrinter(printerName: string) {
  await rawPrint(printerName, ['\x1B\x40\x1B\x61\x01WMS Repuestos\nPrueba de impresion correcta\n\n\n\x1D\x56\x00'])
}

export async function openQzCashDrawer(printerName: string) {
  await rawPrint(printerName, ['\x10\x14\x01\x00\x05'])
}
