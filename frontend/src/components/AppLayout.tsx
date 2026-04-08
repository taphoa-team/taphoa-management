import React from 'react';
import { Layout, Menu, Button, theme, Typography } from 'antd';
import {
  ShoppingCartOutlined,
  AppstoreOutlined,
  InboxOutlined,
  ShopOutlined,
  TeamOutlined,
  FileTextOutlined,
  SwapOutlined,
  DeleteOutlined,
  AuditOutlined,
  DollarOutlined,
  LogoutOutlined,
  DashboardOutlined,
  ClockCircleOutlined,
  AlertOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { APP_NAME } from '../constants';
import { Breadcrumbs } from './common';
import ErrorBoundary from './ErrorBoundary';
import type { MenuProps } from 'antd';

const { Header, Content } = Layout;

function getMenuItems(role?: string): MenuProps['items'] {
  const items: MenuProps['items'] = [
    { key: '/', icon: <DashboardOutlined />, label: 'Tổng quan' },
    { key: '/alerts', icon: <AlertOutlined />, label: 'Cảnh báo' },
    {
      key: 'sales',
      label: 'Đơn hàng',
      icon: <FileTextOutlined />,
      children: [
        { key: '/invoices', icon: <FileTextOutlined />, label: 'Lịch sử đơn' },
        { key: '/shifts', icon: <ClockCircleOutlined />, label: 'Ca bán hàng' },
        { key: '/returns', icon: <SwapOutlined />, label: 'Trả hàng' },
      ],
    },
    {
      key: 'products',
      label: 'Hàng hóa',
      icon: <AppstoreOutlined />,
      children: [
        { key: '/products', icon: <AppstoreOutlined />, label: 'Sản phẩm' },
        { key: '/categories', icon: <AppstoreOutlined />, label: 'Nhóm hàng' },
      ],
    },
    {
      key: 'inventory',
      label: 'Kho',
      icon: <InboxOutlined />,
      children: [
        { key: '/inventory', icon: <InboxOutlined />, label: 'Tồn kho' },
        { key: '/purchase-orders', icon: <ShopOutlined />, label: 'Nhập hàng' },
        { key: '/suppliers', icon: <ShopOutlined />, label: 'Nhà cung cấp' },
        { key: '/inventory-checks', icon: <AuditOutlined />, label: 'Kiểm kê' },
        { key: '/waste', icon: <DeleteOutlined />, label: 'Xuất hủy' },
      ],
    },
    {
      key: 'customers',
      label: 'Khách hàng',
      icon: <TeamOutlined />,
      children: [
        { key: '/customers', icon: <TeamOutlined />, label: 'Danh sách' },
        { key: '/debts', icon: <DollarOutlined />, label: 'Công nợ' },
      ],
    },
  ];

  if (role === 'admin') {
    items.push({ key: '/reports', icon: <BarChartOutlined />, label: 'Báo cáo' });
  }

  items.push({ type: 'divider' as const });
  items.push({ key: '/pos', icon: <ShoppingCartOutlined />, label: 'Bán hàng' });

  return items;
}

// Tìm parent key cho submenu mở sẵn
function getOpenKey(pathname: string, items: MenuProps['items']): string[] {
  for (const item of items || []) {
    if (item && 'children' in item && item.children) {
      for (const child of item.children) {
        if (child && 'key' in child && child.key === pathname) {
          return [item.key as string];
        }
      }
    }
  }
  return [];
}

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Match /customers/:id → /customers, /invoices/:id → /invoices
  const selectedKey = location.pathname.replace(/\/\d+$/, '') || '/';
  const menuItems = getMenuItems(user?.role);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 🎨 Header với gradient Teal - đồng bộ theme mới */}
      <Header 
        style={{
          padding: '0 24px',
          background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 50%, #14b8a6 100%)', // Gradient Teal
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)', // Đổ bóng nhẹ
        }}
      >
        {/* Logo với style mới */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <div style={{
            width: 36,
            height: 36,
            background: 'rgba(255,255,255,0.2)',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            fontWeight: 'bold',
            color: '#fff',
          }}>
            F
          </div>
          <Typography.Title 
            level={4} 
            style={{ 
              color: '#fff', 
              margin: 0, 
              whiteSpace: 'nowrap',
              fontWeight: 600,
              letterSpacing: 0.5,
            }}
          >
            {APP_NAME}
          </Typography.Title>
        </div>

        {/* Menu ngang với style mới */}
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[selectedKey]}
          defaultOpenKeys={getOpenKey(selectedKey, menuItems)}
          items={menuItems}
          onClick={({ key }) => {
            if (!key.startsWith('/')) return; // skip group keys
            if (key === '/pos') {
              window.open(key, '_blank');
              return;
            }
            navigate(key);
          }}
          style={{
            flex: 1,
            minWidth: 0,
            borderBottom: 'none',
            background: 'transparent',
            fontSize: 15,
          }}
        />

        {/* User info + logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, whiteSpace: 'nowrap' }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
          }}>
            <Typography.Text style={{ color: '#fff', fontWeight: 500, fontSize: 14 }}>
              {user?.name}
            </Typography.Text>
            <Typography.Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
              {user?.role === 'admin' ? 'Quản lý' : 'Nhân viên'}
            </Typography.Text>
          </div>
          <Button 
            type="primary" 
            ghost
            icon={<LogoutOutlined />} 
            onClick={handleLogout}
            style={{ 
              color: '#fff',
              borderColor: 'rgba(255,255,255,0.3)',
              borderRadius: 8,
            }}
          >
            Thoát
          </Button>
        </div>
      </Header>

      <Content style={{ 
        margin: 24, 
        padding: 24, 
        background: colorBgContainer, 
        borderRadius: borderRadiusLG, 
        minHeight: 'calc(100vh - 112px)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)', // Đổ bóng nhẹ cho content
      }}>
        <Breadcrumbs />
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </Content>
    </Layout>
  );
}
