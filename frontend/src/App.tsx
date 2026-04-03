import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CategoriesPage from './pages/CategoriesPage';
import SuppliersPage from './pages/SuppliersPage';
import ProductsPage from './pages/ProductsPage';
import CustomersPage from './pages/CustomersPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import InventoryPage from './pages/InventoryPage';
import ShiftsPage from './pages/ShiftsPage';
import InvoicesPage from './pages/InvoicesPage';
import InvoiceDetailPage from './pages/InvoiceDetailPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import ReturnsPage from './pages/ReturnsPage';
import WastePage from './pages/WastePage';
import InventoryChecksPage from './pages/InventoryChecksPage';
import DebtsPage from './pages/DebtsPage';
import POSPage from './pages/POSPage';
import { Agentation } from 'agentation';

function App() {
  return (
    <ConfigProvider locale={viVN} theme={{ token: { colorPrimary: '#1677ff' } }}>
      <AuthProvider>
        <BrowserRouter>
          <Agentation endpoint="http://localhost:4747" />
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
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;
