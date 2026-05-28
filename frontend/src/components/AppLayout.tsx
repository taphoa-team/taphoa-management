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
import {
  Layout,
  Menu,
  Button,
  theme,
  Typography,
  Modal,
  Form,
  InputNumber,
  Input,
  message,
  Descriptions,
  Tag,
  Divider,
} from 'antd';
import type { MenuProps } from 'antd';
import React, { useMemo, useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';

import { APP_NAME } from '../constants';
import { useAuth } from '../contexts/useAuth';
import { useCurrentShift, useOpenShift, useCloseShift } from '../hooks';
import type { Shift } from '../types';
import { formatVND, inputNumberFormatter, getErrorMessage } from '../utils/format';

import ChatWidget from './chat/ChatWidget';
import { Breadcrumbs } from './common';
import ErrorBoundary from './ErrorBoundary';

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
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // Shift management
  const { data: currentShift, isLoading: shiftLoading } = useCurrentShift();
  const openShiftMutation = useOpenShift();
  const closeShiftMutation = useCloseShift();

  const [closeModal, setCloseModal] = useState(false);
  const [openForm] = Form.useForm();
  const [closeForm] = Form.useForm();

  // Bắt buộc mở ca nếu chưa có ca đang mở (chỉ staff, admin không cần)
  const mustOpenShift = !shiftLoading && currentShift === null && user?.role !== 'admin';

  const handleOpenShift = async () => {
    const values = await openForm.validateFields();
    try {
      await openShiftMutation.mutateAsync(values);
      message.success('Đã mở ca');
      openForm.resetFields();
    } catch (err: unknown) {
      message.error(getErrorMessage(err));
    }
  };

  const handleChangeShift = async () => {
    if (!currentShift) return;
    const values = await closeForm.validateFields();
    try {
      // 1. Đóng ca cũ
      const res = await closeShiftMutation.mutateAsync({
        id: currentShift.id,
        data: { closing_cash: values.closing_cash, note: values.note },
      });
      const closedShift = res.data as Shift;

      // 2. Mở ca mới
      await openShiftMutation.mutateAsync({
        cashier_name: values.new_cashier_name,
        opening_cash: values.new_opening_cash || 0,
      });

      setCloseModal(false);
      closeForm.resetFields();

      // Hiện kết quả đóng ca
      Modal.info({
        title: 'Kết quả đóng ca',
        width: 500,
        content: (
          <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
            <Descriptions.Item label="Nhân viên">
              {closedShift.cashier_name}
            </Descriptions.Item>
            <Descriptions.Item label="Tiền đầu ca">
              {formatVND(closedShift.opening_cash)}
            </Descriptions.Item>
            <Descriptions.Item label="Doanh thu">
              {formatVND(closedShift.total_sales)}
            </Descriptions.Item>
            <Descriptions.Item label="Số đơn">{closedShift.total_invoices}</Descriptions.Item>
            <Descriptions.Item label="Tiền mặt lý thuyết">
              {formatVND(closedShift.expected_cash)}
            </Descriptions.Item>
            <Descriptions.Item label="Tiền mặt thực tế">
              {formatVND(closedShift.closing_cash)}
            </Descriptions.Item>
            <Descriptions.Item label="Chênh lệch">
              <Tag color={closedShift.difference === 0 ? 'green' : 'red'}>
                {formatVND(closedShift.difference)}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        ),
      });
      message.success('Đã thay ca');
    } catch (err: unknown) {
      message.error(getErrorMessage(err));
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Match /customers/:id → /customers, /invoices/:id → /invoices
  const selectedKey = location.pathname.replace(/\/\d+$/, '') || '/';
  const menuItems = useMemo(() => getMenuItems(user?.role), [user?.role]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          padding: '0 24px',
          background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 50%, #14b8a6 100%)',
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
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
            }}
          >
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

        {/* Menu ngang */}
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[selectedKey]}
          defaultOpenKeys={getOpenKey(selectedKey, menuItems)}
          items={menuItems}
          onClick={({ key }) => {
            if (!key.startsWith('/')) return;
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

        {/* Shift info + Thay ca */}
        {currentShift && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap' }}>
            <ClockCircleOutlined style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }} />
            <Typography.Text style={{ color: '#fff', fontSize: 13 }}>
              Ca #{currentShift.id} &mdash; {currentShift.cashier_name}
            </Typography.Text>
            <Button
              size="small"
              icon={<SwapOutlined />}
              onClick={() => {
                closeForm.resetFields();
                setCloseModal(true);
              }}
              style={{
                borderColor: 'rgba(255,255,255,0.3)',
                color: '#fff',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: 6,
              }}
            >
              Thay ca
            </Button>
          </div>
        )}

        {/* User info + logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, whiteSpace: 'nowrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
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

      <Content
        style={{
          margin: 24,
          padding: 24,
          background: colorBgContainer,
          borderRadius: borderRadiusLG,
          minHeight: 'calc(100vh - 112px)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <Breadcrumbs />
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </Content>

      {/* Modal bắt buộc mở ca */}
      <Modal
        title="Mở ca bán hàng"
        open={mustOpenShift}
        closable={false}
        maskClosable={false}
        onOk={handleOpenShift}
        confirmLoading={openShiftMutation.isPending}
        okText="Mở ca"
        cancelButtonProps={{ style: { display: 'none' } }}
      >
        <Form form={openForm} layout="vertical">
          <Form.Item
            name="cashier_name"
            label="Tên nhân viên"
            rules={[{ required: true, message: 'Nhập tên nhân viên' }]}
          >
            <Input placeholder="VD: Lan, Hoa, Minh..." />
          </Form.Item>
          <Form.Item name="opening_cash" label="Tiền đầu ca (VNĐ)" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} formatter={inputNumberFormatter} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal thay ca (đóng ca cũ + mở ca mới) */}
      <Modal
        title="Thay ca"
        open={closeModal}
        onOk={handleChangeShift}
        onCancel={() => setCloseModal(false)}
        confirmLoading={closeShiftMutation.isPending || openShiftMutation.isPending}
        okText="Thay ca"
        cancelText="Hủy"
        width={480}
      >
        <Form form={closeForm} layout="vertical">
          <Typography.Text strong>Đóng ca hiện tại — {currentShift?.cashier_name}</Typography.Text>
          <Form.Item
            name="closing_cash"
            label="Tiền mặt thực tế cuối ca (VNĐ)"
            rules={[{ required: true, message: 'Nhập số tiền' }]}
            style={{ marginTop: 12 }}
          >
            <InputNumber min={0} style={{ width: '100%' }} formatter={inputNumberFormatter} />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Divider />

          <Typography.Text strong>Mở ca mới</Typography.Text>
          <Form.Item
            name="new_cashier_name"
            label="Tên nhân viên mới"
            rules={[{ required: true, message: 'Nhập tên nhân viên' }]}
            style={{ marginTop: 12 }}
          >
            <Input placeholder="VD: Lan, Hoa, Minh..." />
          </Form.Item>
          <Form.Item name="new_opening_cash" label="Tiền đầu ca (VNĐ)" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} formatter={inputNumberFormatter} />
          </Form.Item>
        </Form>
      </Modal>

      <ChatWidget />
    </Layout>
  );
}
