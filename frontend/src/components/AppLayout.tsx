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
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { APP_NAME } from '../utils/format';
import type { MenuProps } from 'antd';

const { Header, Content } = Layout;

const menuItems: MenuProps['items'] = [
  { key: '/', icon: <DashboardOutlined />, label: 'Tổng quan' },
  { key: '/alerts', icon: <AlertOutlined />, label: 'Cảnh báo' },
  { key: '/pos', icon: <ShoppingCartOutlined />, label: 'Bán hàng' },
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

// Tìm parent key cho submenu mở sẵn
function getOpenKey(pathname: string): string[] {
  for (const item of menuItems || []) {
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

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{
        padding: '0 24px',
        background: '#001529',
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        {/* Logo */}
        <Typography.Title level={4} style={{ color: '#fff', margin: 0, whiteSpace: 'nowrap', minWidth: 120 }}>
          {APP_NAME}
        </Typography.Title>

        {/* Menu ngang */}
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[selectedKey]}
          defaultOpenKeys={getOpenKey(selectedKey)}
          items={menuItems}
          onClick={({ key }) => {
            if (!key.startsWith('/')) return; // skip group keys
            navigate(key);
          }}
          style={{ flex: 1, minWidth: 0, borderBottom: 'none' }}
        />

        {/* User info + logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, whiteSpace: 'nowrap' }}>
          <Typography.Text style={{ color: 'rgba(255,255,255,0.65)' }}>
            {user?.name} ({user?.role})
          </Typography.Text>
          <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout} style={{ color: 'rgba(255,255,255,0.65)' }}>
            Thoát
          </Button>
        </div>
      </Header>

      <Content style={{ margin: 24, padding: 24, background: colorBgContainer, borderRadius: borderRadiusLG, minHeight: 'calc(100vh - 112px)' }}>
        <Outlet />
      </Content>
    </Layout>
  );
}
