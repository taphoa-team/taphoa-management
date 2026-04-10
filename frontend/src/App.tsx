import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import { Agentation } from 'agentation';

// 🚀 Lazy loading các pages để giảm bundle size ban đầu
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const CategoriesPage = React.lazy(() => import('./pages/CategoriesPage'));
const SuppliersPage = React.lazy(() => import('./pages/SuppliersPage'));
const ProductsPage = React.lazy(() => import('./pages/ProductsPage'));
const CustomersPage = React.lazy(() => import('./pages/CustomersPage'));
const CustomerDetailPage = React.lazy(() => import('./pages/CustomerDetailPage'));
const InventoryPage = React.lazy(() => import('./pages/InventoryPage'));
const ShiftsPage = React.lazy(() => import('./pages/ShiftsPage'));
const InvoicesPage = React.lazy(() => import('./pages/InvoicesPage'));
const InvoiceDetailPage = React.lazy(() => import('./pages/InvoiceDetailPage'));
const PurchaseOrdersPage = React.lazy(() => import('./pages/PurchaseOrdersPage'));
const ReturnsPage = React.lazy(() => import('./pages/ReturnsPage'));
const WastePage = React.lazy(() => import('./pages/WastePage'));
const InventoryChecksPage = React.lazy(() => import('./pages/InventoryChecksPage'));
const DebtsPage = React.lazy(() => import('./pages/DebtsPage'));
const POSPage = React.lazy(() => import('./pages/POSPage'));
const AlertsPage = React.lazy(() => import('./pages/AlertsPage'));
const ReportsPage = React.lazy(() => import('./pages/ReportsPage'));

// 🎨 Theme mới - Xanh ngọc (Teal) tươi mát, chuyên nghiệp
// 🔄 Loading fallback component khi lazy load
const PageLoader = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh' 
  }}>
    <Spin size="large" tip="Đang tải..." />
  </div>
);

const theme = {
  token: {
    // Màu chính - Xanh ngọc đậm
    colorPrimary: '#0d9488',      // Teal 600 - màu chủ đạo
    colorPrimaryHover: '#0f766e', // Teal 700 - hover
    colorPrimaryActive: '#115e59', // Teal 800 - active
    
    // Các màu phụ
    colorSuccess: '#22c55e',      // Green 500 - thành công
    colorWarning: '#f59e0b',      // Amber 500 - cảnh báo
    colorError: '#ef4444',        // Red 500 - lỗi
    colorInfo: '#3b82f6',         // Blue 500 - thông tin
    
    // Màu nền và text
    colorBgLayout: '#f0fdfa',     // Teal 50 - nền layout nhẹ nhàng
    colorText: '#1f2937',         // Gray 800 - text chính
    colorTextSecondary: '#6b7280', // Gray 500 - text phụ
    
    // Border và radius
    borderRadius: 10,             // Bo góc nhẹ nhàng
    borderRadiusLG: 12,           // Bo góc lớn hơn cho card/modal
    
    // Kích thước
    controlHeight: 36,            // Chiều cao input/button vừa phải
    
    // Font
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  components: {
    Button: {
      borderRadius: 8,
      controlHeight: 40,          // Button cao hơn một chút - dễ bấm
    },
    Card: {
      borderRadius: 12,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)', // Đổ bóng nhẹ
    },
    Menu: {
      borderRadius: 8,
    },
    Table: {
      borderRadius: 8,
      headerBg: '#f0fdfa',        // Nền header bảng màu teal nhạt
    },
    Input: {
      borderRadius: 8,
    },
    Modal: {
      borderRadius: 16,           // Modal bo góc nhiều hơn
    },
    Tag: {
      borderRadius: 6,
    },
  },
};

function App() {
  return (
    <ConfigProvider locale={viVN} theme={theme}>
      <AuthProvider>
        <BrowserRouter>
          {process.env.NODE_ENV === 'development' && <Agentation endpoint="http://localhost:4747" />}
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            {/* POS full-screen riêng — không có navigation */}
            <Route path="/pos" element={<ProtectedRoute><POSPage /></ProtectedRoute>} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/invoices" element={<InvoicesPage />} />
              <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
              <Route path="/shifts" element={<ShiftsPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
              <Route path="/suppliers" element={<SuppliersPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/customers/:id" element={<CustomerDetailPage />} />
              <Route path="/debts" element={<DebtsPage />} />
              <Route path="/returns" element={<ReturnsPage />} />
              <Route path="/inventory-checks" element={<InventoryChecksPage />} />
              <Route path="/waste" element={<WastePage />} />
              <Route path="/reports" element={<ReportsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;
