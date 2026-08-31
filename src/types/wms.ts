// Navigation pages for the WMS SPA
export type WmsPage =
  | 'dashboard'
  | 'products'
  | 'equipment'
  | 'locations'
  | 'inventory'
  | 'receiving'
  | 'sales'
  | 'clients'
  | 'movements'
  | 'reports'
  | 'alerts'
  | 'physicalInventory'
  | 'settings'
  | 'userManagement'
  | 'license'
  | 'empresas'
  | 'almacenes';

// Nav item for sidebar
export interface NavItem {
  id: WmsPage;
  label: string;
  icon: string; // Lucide icon name
  badge?: number;
}

// Dashboard stats
export interface DashboardStats {
  totalStockValue: number;
  lowStockCount: number;
  salesToday: number;
  salesWeek: number;
  salesMonth: number;
  movementsToday: number;
  totalProducts: number;
  totalClients: number;
}

// Product with relations
export interface ProductWithRelations {
  id: number;
  sku: string;
  nombre: string;
  descripcion: string | null;
  idCategoria: number | null;
  idMarca: number | null;
  codigoBarras: string | null;
  unidadMedida: string;
  costoUnitario: number;
  precioVenta: number;
  stockMinimo: number;
  stockMaximo: number | null;
  fotoUrl: string | null;
  activo: boolean;
  fechaCreacion: string;
  categoria?: { id: number; nombre: string } | null;
  marca?: { id: number; nombre: string } | null;
  stocks?: StockWithLocation[];
  totalStock?: number;
}

export interface StockWithLocation {
  idProducto: number;
  idUbicacion: number;
  cantidad: number;
  ubicacion: {
    id: number;
    pasillo: string;
    estante: string;
    nivel: string;
    activo: boolean;
  };
}

// Movement with relations
export interface MovimientoWithRelations {
  id: number;
  idProducto: number;
  idUbicacion: number | null;
  idTipo: number;
  cantidad: number;
  costoUnitario: number | null;
  referencia: string | null;
  usuario: string | null;
  observacion: string | null;
  fecha: string;
  producto: { id: number; sku: string; nombre: string };
  ubicacion?: { id: number; pasillo: string; estante: string; nivel: string } | null;
  tipoMovimiento: { id: number; nombre: string };
}

// Sale with relations
export interface VentaWithDetails {
  id: number;
  idCliente: number;
  folio: string;
  fecha: string;
  subtotal: number | null;
  total: number | null;
  estado: string;
  cliente: { id: number; nombre: string; telefono: string | null };
  detalles: VentaDetalleWithProduct[];
}

export interface VentaDetalleWithProduct {
  idVenta: number;
  idProducto: number;
  cantidad: number;
  precioUnitario: number;
  producto: { id: number; sku: string; nombre: string; precioVenta: number };
}

// Equipment with relations
export interface EquipoWithRelations {
  id: number;
  idMarca: number;
  modelo: string;
  tipoEquipo: string | null;
  marca: { id: number; nombre: string };
  productoEquipo?: { idProducto: number; producto: { id: number; sku: string; nombre: string } }[];
}

// Report types
export interface DeadStockItem {
  id: number;
  sku: string;
  nombre: string;
  totalStock: number;
  costoUnitario: number;
  valorTotal: number;
  lastMovementDate: string | null;
  daysSinceMovement: number;
}

export interface TopSeller {
  productoId: number;
  sku: string;
  nombre: string;
  cantidadVendida: number;
  valorTotal: number;
}

export interface ClientSales {
  clienteId: number;
  nombre: string;
  totalVentas: number;
  cantidadProductos: number;
  valorTotal: number;
}

export interface EquipmentDemand {
  equipoId: number;
  modelo: string;
  marca: string;
  tipoEquipo: string | null;
  repuestosCount: number;
  totalDemand: number;
}

// Quick search result
export interface SearchResult {
  type: 'product' | 'equipment';
  id: number;
  sku?: string;
  nombre: string;
  subtext?: string;
}

// Multi-empresa types
export interface Empresa {
  id: number
  nombre: string
  nit: string | null
  direccion: string | null
  telefono: string | null
  email: string | null
  logo: string | null
  activa: boolean
  plan: string
  fechaCreacion: string
  _count?: {
    usuarios: number
    almacenes: number
  }
}

export interface Almacen {
  id: number
  nombre: string
  direccion: string | null
  telefono: string | null
  encargado: string | null
  activo: boolean
  empresaId: number
  empresa?: { id: number; nombre: string }
  _count?: {
    usuarios: number
    ubicaciones: number
  }
}

export interface EmpresaStats {
  totalEmpresas: number
  totalAlmacenes: number
  totalUsuarios: number
  empresasActivas: number
  almacenesActivos: number
}
