import React, { useState } from 'react';
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
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: 'Tổng quan' },
  { key: '/pos', icon: <ShoppingCartOutlined />, label: 'Bán hàng' },
  { key: '/invoices', icon: <FileTextOutlined />, label: 'Đơn hàng' },
  { key: '/shifts', icon: <ClockCircleOutlined />, label: 'Ca bán hàng' },
  { key: '/products', icon: <AppstoreOutlined />, label: 'Sản phẩm' },
  { key: '/categories', icon: <AppstoreOutlined />, label: 'Nhóm hàng' },
  { key: '/inventory', icon: <InboxOutlined />, label: 'Tồn kho' },
  { key: '/purchase-orders', icon: <ShopOutlined />, label: 'Nhập hàng' },
  { key: '/suppliers', icon: <ShopOutlined />, label: 'Nhà cung cấp' },
  { key: '/customers', icon: <TeamOutlined />, label: 'Khách hàng' },
  { key: '/debts', icon: <DollarOutlined />, label: 'Công nợ' },
  { key: '/returns', icon: <SwapOutlined />, label: 'Trả hàng' },
  { key: '/inventory-checks', icon: <AuditOutlined />, label: 'Kiểm kê' },
  { key: '/waste', icon: <DeleteOutlined />, label: 'Xuất hủy' },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        breakpoint="lg"
        onBreakpoint={(broken) => setCollapsed(broken)}
        style={{ overflow: 'auto', height: '100vh', position: 'fixed', left: 0, top: 0, bottom: 0 }}
      >
        <div style={{ height: 48, margin: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography.Title level={4} style={{ color: '#fff', margin: 0, whiteSpace: 'nowrap' }}>
            {collapsed ? 'TH' : 'Tap Hoa'}
          </Typography.Title>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin-left 0.2s' }}>
        <Header style={{ padding: '0 24px', background: colorBgContainer, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span>{user?.name} ({user?.role})</span>
            <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout}>
              Thoát
            </Button>
          </div>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: colorBgContainer, borderRadius: borderRadiusLG, minHeight: 360 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
