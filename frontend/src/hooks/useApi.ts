import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import api from '../services/api';
import type {
  Invoice,
  Shift,
  Product,
  ProductWithStock,
  Category,
  Customer,
  Supplier,
  PurchaseOrder,
  InventoryItem,
  InventoryCheck,
  WasteRecord,
  Return,
  ProductBatch,
  PriceHistoryItem,
  UnitConversion,
  RevenueReport,
  ProfitDataPoint,
  CompareReport,
  TopProductItem,
  Debt,
} from '../types';

// ─── Mutation Input Types ───────────────────────────────────────────────────

export interface CreateInvoiceInput {
  customer_id?: number;
  discount_amount: number;
  payment_method: string;
  cash_amount: number;
  cash_given: number;
  items: { product_id: number; quantity: number; unit: string }[];
}

export interface CreatePurchaseOrderInput {
  supplier_id: number;
  paid?: number;
  note?: string;
  items: {
    product_id: number;
    quantity: number;
    unit?: string;
    cost_price: number;
    expiry_date?: string;
  }[];
}

export interface CreateWasteInput {
  product_id: number;
  batch_id: number;
  quantity: number;
  reason: string;
  note?: string;
}

export interface CreateReturnInput {
  invoice_id: number;
  reason: string;
  items: {
    product_id: number;
    batch_id: number;
    quantity: number;
    refund_price: number;
  }[];
}

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const queryKeys = {
  invoices: {
    all: ['invoices'] as const,
    today: () => [...queryKeys.invoices.all, 'today'] as const,
    list: (params: Record<string, unknown>) => [...queryKeys.invoices.all, 'list', params] as const,
    detail: (id: number) => [...queryKeys.invoices.all, id] as const,
  },
  shifts: {
    all: ['shifts'] as const,
    list: (limit?: number) => [...queryKeys.shifts.all, 'list', limit] as const,
    current: () => [...queryKeys.shifts.all, 'current'] as const,
  },
  products: {
    all: ['products'] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.products.all, 'list', params] as const,
    detail: (id: number) => [...queryKeys.products.all, id] as const,
    batches: (id: number) => [...queryKeys.products.all, id, 'batches'] as const,
    priceHistory: (id: number) => [...queryKeys.products.all, id, 'priceHistory'] as const,
    conversions: (id: number) => [...queryKeys.products.all, id, 'conversions'] as const,
  },
  categories: {
    all: ['categories'] as const,
  },
  customers: {
    all: ['customers'] as const,
    list: (params?: Record<string, unknown>) =>
      [...queryKeys.customers.all, 'list', params] as const,
    detail: (id: number) => [...queryKeys.customers.all, id] as const,
  },
  suppliers: {
    all: ['suppliers'] as const,
  },
  alerts: {
    all: ['alerts'] as const,
    summary: () => [...queryKeys.alerts.all, 'summary'] as const,
    lowStock: () => [...queryKeys.alerts.all, 'lowStock'] as const,
    expiry: (days?: number, limit?: number) =>
      [...queryKeys.alerts.all, 'expiry', days, limit] as const,
  },
  purchaseOrders: {
    all: ['purchaseOrders'] as const,
    list: (page: number) => [...queryKeys.purchaseOrders.all, 'list', page] as const,
    detail: (id: number) => [...queryKeys.purchaseOrders.all, id] as const,
  },
  inventory: {
    all: ['inventory'] as const,
    list: (search?: string) => [...queryKeys.inventory.all, 'list', search] as const,
  },
  inventoryChecks: {
    all: ['inventoryChecks'] as const,
    detail: (id: number) => [...queryKeys.inventoryChecks.all, id] as const,
  },
  waste: {
    all: ['waste'] as const,
    list: (page: number) => [...queryKeys.waste.all, 'list', page] as const,
  },
  returns: {
    all: ['returns'] as const,
    list: (page: number) => [...queryKeys.returns.all, 'list', page] as const,
  },
  debts: {
    all: ['debts'] as const,
  },
  reports: {
    revenue: (from: string, to: string) => ['reports', 'revenue', from, to] as const,
    profit: (from: string, to: string) => ['reports', 'profit', from, to] as const,
    compare: () => ['reports', 'compare'] as const,
    topProducts: (from: string, to: string, sort: string) =>
      ['reports', 'topProducts', from, to, sort] as const,
  },
};

// ─── Dashboard Queries ──────────────────────────────────────────────────────

export function useTodayInvoices() {
  return useQuery({
    queryKey: queryKeys.invoices.today(),
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const res = await api.get('/invoices', { params: { date: today, limit: 100 } });
      return res.data as Invoice[];
    },
  });
}

export function useCurrentShift() {
  return useQuery({
    queryKey: queryKeys.shifts.current(),
    queryFn: async () => {
      const res = await api.get('/shifts/current');
      return res.data as Shift | null;
    },
  });
}

export function useAlertSummary() {
  return useQuery({
    queryKey: queryKeys.alerts.summary(),
    queryFn: async () => {
      const res = await api.get('/alerts/summary');
      return res.data as {
        expiring_7d: number;
        expiring_30d: number;
        expired: number;
        low_stock: number;
        out_of_stock: number;
      };
    },
  });
}

export function useLowStockAlerts() {
  return useQuery({
    queryKey: queryKeys.alerts.lowStock(),
    queryFn: async () => {
      const res = await api.get('/alerts/low-stock');
      return (res.data || []) as {
        id: number;
        name: string;
        sku: string;
        unit: string;
        stock: number;
        min_quantity: number;
        warning: string;
      }[];
    },
  });
}

export function useExpiryAlerts(days = 7, limit = 10) {
  return useQuery({
    queryKey: queryKeys.alerts.expiry(days, limit),
    queryFn: async () => {
      const res = await api.get('/alerts/expiry', { params: { days, limit } });
      return (res.data || []) as {
        id: number;
        product_id: number;
        product: { id: number; name: string; sku: string; unit: string };
        quantity: number;
        cost_price: number;
        expiry_date: string;
        days_left: number;
      }[];
    },
  });
}

// ─── Categories ─────────────────────────────────────────────────────────────

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data as Category[];
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) => api.post('/categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name: string } }) =>
      api.put(`/categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}

// ─── Suppliers ──────────────────────────────────────────────────────────────

export function useSuppliers() {
  return useQuery({
    queryKey: queryKeys.suppliers.all,
    queryFn: async () => {
      const res = await api.get('/suppliers');
      return (res.data || []) as Supplier[];
    },
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Supplier>) => api.post('/suppliers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Supplier> }) =>
      api.put(`/suppliers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/suppliers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
    },
  });
}

// ─── Customers ──────────────────────────────────────────────────────────────

export function useCustomers(params?: { page?: number; limit?: number; search?: string }) {
  return useQuery({
    queryKey: queryKeys.customers.list(params),
    queryFn: async () => {
      const res = await api.get('/customers', { params });
      return (res.data || []) as Customer[];
    },
  });
}

export function useCustomerDetail(id: number) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: async () => {
      const res = await api.get(`/customers/${id}`);
      return res.data as {
        customer: Customer;
        invoices: Invoice[];
        debts: Debt[];
      };
    },
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Customer>) => api.post('/customers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Customer> }) =>
      api.put(`/customers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
    },
  });
}

export function usePayDebt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { amount: number; note?: string } }) =>
      api.post(`/customers/${id}/debt-payment`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.debts.all });
    },
  });
}

// ─── Products ───────────────────────────────────────────────────────────────

export function useProducts(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.products.list(params),
    queryFn: async () => {
      const res = await api.get('/products', { params });
      return (res.data || []) as ProductWithStock[];
    },
  });
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: async () => {
      const res = await api.get(`/products/${id}`);
      return res.data as Product;
    },
    enabled: !!id,
  });
}

export function useProductBatches(productId: number) {
  return useQuery({
    queryKey: queryKeys.products.batches(productId),
    queryFn: async () => {
      const res = await api.get(`/products/${productId}/batches`);
      return (res.data || []) as ProductBatch[];
    },
    enabled: !!productId,
  });
}

export function usePriceHistory(productId: number) {
  return useQuery({
    queryKey: queryKeys.products.priceHistory(productId),
    queryFn: async () => {
      const res = await api.get(`/products/${productId}/price-history`);
      return (res.data || []) as PriceHistoryItem[];
    },
    enabled: !!productId,
  });
}

export function useProductConversions(productId: number) {
  return useQuery({
    queryKey: queryKeys.products.conversions(productId),
    queryFn: async () => {
      const res = await api.get(`/products/${productId}/conversions`);
      return (res.data || []) as UnitConversion[];
    },
    enabled: !!productId,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Product>) => api.post('/products', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Product> }) =>
      api.put(`/products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}

export function useDeactivateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.patch(`/products/${id}/deactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}

export function useCreateConversion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      productId,
      data,
    }: {
      productId: number;
      data: { from_unit: string; to_unit: string; conversion_rate: number };
    }) => api.post(`/products/${productId}/conversions`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.conversions(variables.productId),
      });
    },
  });
}

export function useDeleteConversion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, conversionId }: { productId: number; conversionId: number }) =>
      api.delete(`/products/${productId}/conversions/${conversionId}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.conversions(variables.productId),
      });
    },
  });
}

// ─── Invoices ───────────────────────────────────────────────────────────────

export function useInvoices(params?: { page?: number; limit?: number; date?: string }) {
  return useQuery({
    queryKey: queryKeys.invoices.list(params || {}),
    queryFn: async () => {
      const res = await api.get('/invoices', { params });
      return (res.data || []) as Invoice[];
    },
  });
}

export function useInvoice(id: number) {
  return useQuery({
    queryKey: queryKeys.invoices.detail(id),
    queryFn: async () => {
      const res = await api.get(`/invoices/${id}`);
      return res.data as Invoice;
    },
    enabled: !!id,
  });
}

export function useCancelInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.patch(`/invoices/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
    },
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInvoiceInput) => api.post('/invoices', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
    },
  });
}

// ─── Shifts ─────────────────────────────────────────────────────────────────

export function useShifts(limit = 20) {
  return useQuery({
    queryKey: queryKeys.shifts.list(limit),
    queryFn: async () => {
      const res = await api.get('/shifts', { params: { limit } });
      return (res.data || []) as Shift[];
    },
  });
}

export function useOpenShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { opening_cash: number }) => api.post('/shifts/open', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all });
    },
  });
}

export function useCloseShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { closing_cash: number; note?: string } }) =>
      api.post(`/shifts/${id}/close`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all });
    },
  });
}

// ─── Debts ──────────────────────────────────────────────────────────────────

export function useDebts() {
  return useQuery({
    queryKey: queryKeys.debts.all,
    queryFn: async () => {
      const res = await api.get('/debts/summary');
      return (res.data || []) as Customer[];
    },
  });
}

// ─── Inventory ──────────────────────────────────────────────────────────────

export function useInventory(search?: string) {
  return useQuery({
    queryKey: queryKeys.inventory.list(search),
    queryFn: async () => {
      const params: Record<string, unknown> = { limit: 100 };
      if (search) params.search = search;
      const res = await api.get('/inventory', { params });
      return (res.data || []) as InventoryItem[];
    },
  });
}

// ─── Inventory Checks ───────────────────────────────────────────────────────

export function useInventoryChecks() {
  return useQuery({
    queryKey: queryKeys.inventoryChecks.all,
    queryFn: async () => {
      const res = await api.get('/inventory-checks');
      return (res.data || []) as InventoryCheck[];
    },
  });
}

export function useInventoryCheck(id: number | null) {
  return useQuery({
    queryKey: queryKeys.inventoryChecks.detail(id ?? 0),
    queryFn: async () => {
      const res = await api.get(`/inventory-checks/${id}`);
      return res.data as InventoryCheck;
    },
    enabled: !!id,
  });
}

export function useCreateInventoryCheck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/inventory-checks'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventoryChecks.all });
    },
  });
}

export function useUpdateInventoryCheckItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      items,
    }: {
      id: number;
      items: { product_id: number; actual_quantity: number; note?: string }[];
    }) => api.put(`/inventory-checks/${id}/items`, { items }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventoryChecks.detail(variables.id),
      });
    },
  });
}

export function useConfirmInventoryCheck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post(`/inventory-checks/${id}/confirm`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventoryChecks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

// ─── Purchase Orders ────────────────────────────────────────────────────────

export function usePurchaseOrders(page = 1) {
  return useQuery({
    queryKey: queryKeys.purchaseOrders.list(page),
    queryFn: async () => {
      const res = await api.get('/purchase-orders', { params: { page, limit: 20 } });
      return (res.data || []) as PurchaseOrder[];
    },
  });
}

export function usePurchaseOrder(id: number | null) {
  return useQuery({
    queryKey: queryKeys.purchaseOrders.detail(id ?? 0),
    queryFn: async () => {
      const res = await api.get(`/purchase-orders/${id}`);
      return res.data as PurchaseOrder;
    },
    enabled: !!id,
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePurchaseOrderInput) => api.post('/purchase-orders', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

// ─── Waste ──────────────────────────────────────────────────────────────────

export function useWasteRecords(page = 1) {
  return useQuery({
    queryKey: queryKeys.waste.list(page),
    queryFn: async () => {
      const res = await api.get('/waste', { params: { page, limit: 20 } });
      return (res.data || []) as WasteRecord[];
    },
  });
}

export function useCreateWaste() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWasteInput) => api.post('/waste', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.waste.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}

// ─── Returns ────────────────────────────────────────────────────────────────

export function useReturns(page = 1) {
  return useQuery({
    queryKey: queryKeys.returns.list(page),
    queryFn: async () => {
      const res = await api.get('/returns', { params: { page, limit: 20 } });
      return (res.data || []) as Return[];
    },
  });
}

export function useCreateReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateReturnInput) => api.post('/returns', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.returns.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}

// ─── Alerts ─────────────────────────────────────────────────────────────────

export function useSendAlertEmail() {
  return useMutation({
    mutationFn: () => api.post('/alerts/send-email'),
  });
}

// ─── Reports ────────────────────────────────────────────────────────────────

export function useRevenueReport(from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.reports.revenue(from, to),
    queryFn: async () => {
      const res = await api.get<RevenueReport>('/reports/revenue', { params: { from, to } });
      return res.data;
    },
    enabled: !!from && !!to,
  });
}

export function useProfitReport(from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.reports.profit(from, to),
    queryFn: async () => {
      const res = await api.get<ProfitDataPoint[]>('/reports/profit', { params: { from, to } });
      return res.data;
    },
    enabled: !!from && !!to,
  });
}

export function useCompareReport() {
  return useQuery({
    queryKey: queryKeys.reports.compare(),
    queryFn: async () => {
      const res = await api.get<CompareReport>('/reports/compare');
      return res.data;
    },
    staleTime: 60 * 1000, // 1 phút — data so sánh cần fresh hơn default 5 phút
  });
}

export function useTopProducts(from: string, to: string, sort: 'desc' | 'asc' = 'desc') {
  return useQuery({
    queryKey: queryKeys.reports.topProducts(from, to, sort),
    queryFn: async () => {
      const res = await api.get<TopProductItem[]>('/reports/top-products', {
        params: { from, to, limit: 10, sort },
      });
      return res.data;
    },
    enabled: !!from && !!to,
  });
}
