import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Typography, Table, Tag, Statistic, Space } from 'antd';
import {
  ShoppingCartOutlined,
  DollarOutlined,
  WarningOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { formatVND } from '../utils/format';
import { Invoice, Shift, InventoryItem } from '../types';

export default function DashboardPage() {
  const { user } = useAuth();
  const [todayInvoices, setTodayInvoices] = useState<Invoice[]>([]);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [lowStock, setLowStock] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];

    Promise.allSettled([
      api.get('/invoices', { params: { date: today, limit: 100 } }),
      api.get('/shifts/current'),
      api.get('/inventory', { params: { limit: 200 } }),
    ]).then(([invRes, shiftRes, invtRes]) => {
      if (invRes.status === 'fulfilled') setTodayInvoices(invRes.value.data || []);
      if (shiftRes.status === 'fulfilled') setCurrentShift(shiftRes.value.data);
      if (invtRes.status === 'fulfilled') {
        const items: InventoryItem[] = invtRes.value.data || [];
        setLowStock(items.filter((i) => i.warning === 'low' || i.warning === 'out'));
      }
      setLoading(false);
    });
  }, []);

  const completedInvoices = todayInvoices.filter((i) => i.status === 'completed');
  const todayRevenue = completedInvoices.reduce((sum, i) => sum + i.final_total, 0);

  return (
    <div>
      <Typography.Title level={3} style={{ marginBottom: 24 }}>
        Xin chào, {user?.name}!
      </Typography.Title>

      {/* Thống kê nhanh */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card loading={loading}>
            <Statistic
              title="Đơn hôm nay"
              value={completedInvoices.length}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card loading={loading}>
            <Statistic
              title="Doanh thu hôm nay"
              value={todayRevenue}
              prefix={<DollarOutlined />}
              formatter={(v) => formatVND(v as number)}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card loading={loading}>
            <Statistic
              title="Hàng sắp hết"
              value={lowStock.length}
              prefix={<WarningOutlined />}
              valueStyle={lowStock.length > 0 ? { color: '#cf1322' } : undefined}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card loading={loading}>
            <Statistic
              title="Ca hiện tại"
              value={currentShift ? `#${currentShift.id}` : 'Chưa mở'}
              prefix={<ClockCircleOutlined />}
              valueStyle={!currentShift ? { color: '#999' } : undefined}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        {/* Hàng sắp hết kho */}
        <Col xs={24} md={12}>
          <Card title={<Space><WarningOutlined style={{ color: '#faad14' }} /> Hàng sắp hết kho</Space>} size="small">
            <Table
              dataSource={lowStock.slice(0, 10)}
              rowKey="id"
              size="small"
              pagination={false}
              loading={loading}
              locale={{ emptyText: 'Tất cả đều đủ hàng' }}
              columns={[
                { title: 'Sản phẩm', dataIndex: 'name', ellipsis: true },
                {
                  title: 'Tồn kho',
                  dataIndex: 'stock',
                  width: 100,
                  align: 'right',
                  render: (stock: number, record: InventoryItem) => (
                    <Tag color={record.warning === 'out' ? 'red' : 'orange'}>
                      {stock} {record.unit}
                    </Tag>
                  ),
                },
              ]}
            />
          </Card>
        </Col>

        {/* Đơn hàng gần đây */}
        <Col xs={24} md={12}>
          <Card title={<Space><ShoppingCartOutlined /> Đơn gần đây hôm nay</Space>} size="small">
            <Table
              dataSource={completedInvoices.slice(0, 8)}
              rowKey="id"
              size="small"
              pagination={false}
              loading={loading}
              locale={{ emptyText: 'Chưa có đơn hôm nay' }}
              columns={[
                { title: '#', dataIndex: 'id', width: 50 },
                {
                  title: 'Tổng',
                  dataIndex: 'final_total',
                  render: formatVND,
                  align: 'right',
                  width: 120,
                },
                {
                  title: 'Thanh toán',
                  dataIndex: 'payment_method',
                  width: 110,
                  render: (v: string) => {
                    const map: Record<string, string> = {
                      cash: 'Tiền mặt', transfer: 'CK', mixed: 'Kết hợp', debt: 'Ghi nợ',
                    };
                    return map[v] || v;
                  },
                },
                {
                  title: 'Giờ',
                  dataIndex: 'created_at',
                  width: 80,
                  render: (v: string) => new Date(v).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
