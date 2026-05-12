// TypeScript types matching backend Go models

export interface User {
  id: number;
  name: string;
  phone: string;
  role: 'admin' | 'staff';
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  sku: string;
  barcode: string | null;
  name: string;
  category_id: number;
  category: Category;
  sell_price: number;
  min_quantity: number;
  has_expiry: boolean;
  unit: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  batches?: ProductBatch[];
  unit_conversions?: UnitConversion[];
}

export interface ProductWithStock extends Product {
  stock: number;
}

export interface ProductBatch {
  id: number;
  product_id: number;
  cost_price: number;
  quantity: number;
  expiry_date: string | null;
  received_at: string;
  created_at: string;
}

export interface UnitConversion {
  id: number;
  product_id: number;
  from_unit: string;
  to_unit: string;
  conversion_rate: number;
}

export interface Supplier {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  note: string | null;
  created_at: string;
}

export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  total_debt: number;
  created_at: string;
}

export interface Invoice {
  id: number;
  user_id: number;
  user?: User;
  shift_id: number;
  customer_id: number | null;
  customer?: Customer | null;
  total: number;
  discount_amount: number;
  final_total: number;
  cash_amount: number;
  transfer_amount: number;
  cash_given: number;
  change_amount: number;
  payment_method: 'cash' | 'transfer' | 'mixed' | 'debt';
  status: string;
  note: string | null;
  created_at: string;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  product_id: number;
  product?: Product;
  batch_id: number;
  quantity: number;
  unit: string;
  price: number;
  cost_price: number;
}

export interface PurchaseOrder {
  id: number;
  user_id: number;
  user?: User;
  supplier_id: number;
  supplier?: Supplier;
  total: number;
  paid: number;
  status: string;
  note: string | null;
  created_at: string;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: number;
  purchase_order_id: number;
  product_id: number;
  product?: Product;
  quantity: number;
  unit: string;
  cost_price: number;
  batch_id: number;
}

export interface Shift {
  id: number;
  user_id: number;
  user?: User;
  cashier_name: string;
  opening_cash: number;
  closing_cash: number | null;
  expected_cash: number | null;
  difference: number | null;
  total_sales: number;
  total_invoices: number;
  note: string | null;
  opened_at: string;
  closed_at: string | null;
}

export interface Return {
  id: number;
  invoice_id: number;
  invoice?: Invoice;
  user_id: number;
  user?: User;
  reason: string;
  total_refund: number;
  status: string;
  created_at: string;
  items?: ReturnItem[];
}

export interface ReturnItem {
  id: number;
  return_id: number;
  product_id: number;
  product?: Product;
  batch_id: number;
  quantity: number;
  refund_price: number;
}

export interface WasteRecord {
  id: number;
  product_id: number;
  product?: Product;
  batch_id: number;
  batch?: ProductBatch;
  quantity: number;
  reason: string;
  user_id: number;
  user?: User;
  note: string | null;
  created_at: string;
}

export interface InventoryCheck {
  id: number;
  user_id: number;
  user?: User;
  status: 'draft' | 'completed';
  note: string | null;
  created_at: string;
  completed_at: string | null;
  items?: InventoryCheckItem[];
}

export interface InventoryCheckItem {
  id: number;
  check_id: number;
  product_id: number;
  product?: Product;
  system_quantity: number;
  actual_quantity: number;
  difference: number;
  note: string | null;
}

export interface Debt {
  id: number;
  customer_id: number;
  customer?: Customer;
  invoice_id: number | null;
  invoice?: Invoice | null;
  type: 'debt' | 'payment';
  amount: number;
  note: string | null;
  created_at: string;
}

export interface InventoryItem extends Product {
  stock: number;
  warning: '' | 'low' | 'out';
}

// === Reports ===

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  invoice_count: number;
}

export interface RevenueReport {
  total_revenue: number;
  total_cogs: number;
  total_profit: number;
  invoice_count: number;
  total_discount: number;
  daily: RevenueDataPoint[];
}

export interface ProfitDataPoint {
  date: string;
  revenue: number;
  cogs: number;
  profit: number;
}

export interface TopProductItem {
  product_id: number;
  product_name: string;
  total_qty: number;
  revenue: number;
  profit: number;
}

export interface ComparePeriod {
  revenue: number;
  cogs: number;
  profit: number;
  invoice_count: number;
}

export interface CompareWeeklyItem {
  week: number;
  current_revenue: number;
  previous_revenue: number;
}

export interface CompareReport {
  current: ComparePeriod;
  previous: ComparePeriod;
  weekly: CompareWeeklyItem[];
}

export interface PriceHistoryItem {
  id: number;
  product_id: number;
  old_price: number;
  new_price: number;
  changed_by: number;
  user?: User;
  created_at: string;
}

export interface DiscountDetail {
  invoice_id: number;
  user_name: string;
  discount_amount: number;
  final_total: number;
  created_at: string;
}
