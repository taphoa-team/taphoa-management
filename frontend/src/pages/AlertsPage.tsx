import React, { useEffect, useState, useCallback } from 'react';
import { Tabs, Table, Tag, Select, Space, Button, message, Typography } from 'antd';
import { AlertOutlined, WarningOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { formatVND } from '../utils/format';
import { PageHeader } from '../components/common';

interface ExpiryItem {
  id: number;
  product_id: number;
  product: { id: number; name: string; sku: string; unit: string };
  quantity: number;
  cost_price: number;
  expiry_date: string;
  days_left: number;
}

interface LowStockItem {
  id: number;
  name: string;
  sku: string;
  unit: string;
  stock: number;
  min_quantity: number;
  warning: string;
}

export default function AlertsPage() {
  const navigate = useNavigate();
  const [expiryDays, setExpiryDays] = useState(7);
  const [expiryItems, setExpiryItems] = useState<ExpiryItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [loadingExpiry, setLoadingExpiry] = useState(false);
  const [loadingStock, setLoadingStock] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const fetchExpiry = useCallback(async () => {
    setLoadingExpiry(true);
    try {
      const res = await api.get('/alerts/expiry', { params: { days: expiryDays, limit: 100 } });
      setExpiryItems(res.data || []);
    } catch {
      message.error('Lỗi tải dữ liệu');
    } finally {
      setLoadingExpiry(false);
    }
  }, [expiryDays]);

  const fetchLowStock = useCallback(async () => {
    setLoadingStock(true);
    try {
      const res = await api.get('/alerts/low-stock');
      setLowStockItems(res.data || []);
    } catch {
      message.error('Lỗi tải dữ liệu');
    } finally {
      setLoadingStock(false);
    }
  }, []);

  useEffect(() => { fetchExpiry(); }, [fetchExpiry]);
  useEffect(() => { fetchLowStock(); }, [fetchLowStock]);

  const handleSendEmail = async () => {
    setSendingEmail(true);
    try {
      await api.post('/alerts/send-email');
      message.success('Đã gửi email cảnh báo');
    } catch {
      message.error('Gửi email thất bại. Kiểm tra cấu hình SMTP.');
    } finally {
      setSendingEmail(false);
    }
  };

  const expiryColumns = [
    { title: 'Sản phẩm', dataIndex: ['product', 'name'], ellipsis: true },
    { title: 'SKU', dataIndex: ['product', 'sku'], width: 100 },
    { title: 'Số lượng', dataIndex: 'quantity', width: 90, align: 'right' as const },
    { title: 'Giá vốn', dataIndex: 'cost_price', width: 100, align: 'right' as const, render: formatVND },
    {
      title: 'Hạn sử dụng',
      dataIndex: 'expiry_date',
      width: 120,
      render: (v: string) => new Date(v).toLocaleDateString('vi-VN'),
    },
    {
      title: 'Còn lại',
      dataIndex: 'days_left',
      width: 100,
      align: 'right' as const,
      render: (d: number) => (
        <Tag color={d <= 0 ? 'red' : d <= 3 ? 'orange' : d <= 7 ? 'gold' : 'blue'}>
          {d <= 0 ? 'Đã hết hạn' : `${d} ngày`}
        </Tag>
      ),
    },
    {
      title: '',
      width: 80,
      render: (_: any, record: ExpiryItem) => (
        <Button size="small" danger onClick={() => navigate('/waste')}>Hủy</Button>
      ),
    },
  ];

  const lowStockColumns = [
    { title: 'Sản phẩm', dataIndex: 'name', ellipsis: true },
    { title: 'SKU', dataIndex: 'sku', width: 100 },
    { title: 'ĐVT', dataIndex: 'unit', width: 80 },
    {
      title: 'Tồn kho',
      dataIndex: 'stock',
      width: 100,
      align: 'right' as const,
      render: (stock: number, record: LowStockItem) => (
        <Tag color={record.warning === 'out' ? 'red' : 'orange'}>{stock}</Tag>
      ),
    },
    { title: 'Tối thiểu', dataIndex: 'min_quantity', width: 100, align: 'right' as const },
    {
      title: '',
      width: 80,
      render: () => (
        <Button size="small" type="primary" onClick={() => navigate('/purchase-orders')}>Nhập</Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Cảnh báo"
        extra={<Button
          icon={<MailOutlined />}
          onClick={handleSendEmail}
          loading={sendingEmail}
        >
          Gửi email cảnh báo
        </Button>}
      />

      <Tabs
        defaultActiveKey="expiry"
        items={[
          {
            key: 'expiry',
            label: (
              <span>
                <AlertOutlined /> Sắp hết hạn
                {expiryItems.length > 0 && <Tag color="red" style={{ marginLeft: 8 }}>{expiryItems.length}</Tag>}
              </span>
            ),
            children: (
              <>
                <Space style={{ marginBottom: 16 }}>
                  <Typography.Text>Hiển thị hàng hết hạn trong:</Typography.Text>
                  <Select
                    value={expiryDays}
                    onChange={setExpiryDays}
                    style={{ width: 120 }}
                    options={[
                      { value: 7, label: '7 ngày' },
                      { value: 15, label: '15 ngày' },
                      { value: 30, label: '30 ngày' },
                      { value: 90, label: '90 ngày' },
                    ]}
                  />
                </Space>
                <Table
                  dataSource={expiryItems}
                  columns={expiryColumns}
                  rowKey="id"
                  loading={loadingExpiry}
                  size="middle"
                  pagination={false}
                  locale={{ emptyText: 'Không có hàng sắp hết hạn' }}
                />
              </>
            ),
          },
          {
            key: 'low-stock',
            label: (
              <span>
                <WarningOutlined /> Sắp hết kho
                {lowStockItems.length > 0 && <Tag color="orange" style={{ marginLeft: 8 }}>{lowStockItems.length}</Tag>}
              </span>
            ),
            children: (
              <Table
                dataSource={lowStockItems}
                columns={lowStockColumns}
                rowKey="id"
                loading={loadingStock}
                size="middle"
                pagination={false}
                locale={{ emptyText: 'Tất cả đều đủ hàng' }}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
