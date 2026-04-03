import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Typography, Table, Tag, Statistic, Space, message } from 'antd';
import {
  ShoppingCartOutlined,
  DollarOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  AlertOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { formatVND } from '../utils/format';
import { Invoice, Shift, ProductBatch } from '../types';

interface AlertSummary {
  expiring_7d: number;
  expiring_30d: number;
  expired: number;
  low_stock: number;
  out_of_stock: number;
}

interface LowStockItem {
  id: number;
  name: string;
  unit: string;
  stock: number;
  min_quantity: number;
  warning: string;
}

interface ExpiryAlertItem extends ProductBatch {
  product: { id: number; name: string; sku: string; unit: string };
  days_left: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [todayInvoices, setTodayInvoices] = useState<Invoice[]>([]);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [alertSummary, setAlertSummary] = useState<AlertSummary | null>(null);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [expiring, setExpiring] = useState<ExpiryAlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];

    Promise.allSettled([
      api.get('/invoices', { params: { date: today, limit: 100 } }),
      api.get('/shifts/current'),
      api.get('/alerts/summary'),
      api.get('/alerts/low-stock'),
      api.get('/alerts/expiry', { params: { days: 7, limit: 10 } }),
    ]).then(([invRes, shiftRes, summaryRes, lowRes, expiryRes]) => {
      if (invRes.status === 'fulfilled') setTodayInvoices(invRes.value.data || []);
      if (shiftRes.status === 'fulfilled') setCurrentShift(shiftRes.value.data);
      if (summaryRes.status === 'fulfilled') setAlertSummary(summaryRes.value.data);
      if (lowRes.status === 'fulfilled') setLowStock(lowRes.value.data || []);
      if (expiryRes.status === 'fulfilled') setExpiring(expiryRes.value.data || []);
      const failed = [invRes, summaryRes, lowRes, expiryRes].filter((r) => r.status === 'rejected');
      if (failed.length > 0) message.error('Lỗi tải dữ liệu');
      setLoading(false);
    });
  }, []);

  const completedInvoices = todayInvoices.filter((i) => i.status === 'completed');
  const todayRevenue = completedInvoices.reduce((sum, i) => sum + i.final_total, 0);
  const totalAlerts = alertSummary ? alertSummary.expired + alertSummary.expiring_7d + alertSummary.low_stock + alertSummary.out_of_stock : 0;

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
          <Card loading={loading} hoverable onClick={() => navigate('/alerts')}>
            <Statistic
              title="Cảnh báo"
              value={totalAlerts}
              prefix={<AlertOutlined />}
              valueStyle={totalAlerts > 0 ? { color: '#cf1322' } : undefined}
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

      {/* Cảnh báo chi tiết */}
      {alertSummary && (alertSummary.expired > 0 || alertSummary.expiring_7d > 0) && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={24}>
            <Card size="small" style={{ background: '#fff2f0', borderColor: '#ffccc7' }}>
              <Space size="large">
                {alertSummary.expired > 0 && (
                  <Tag color="red" style={{ fontSize: 14, padding: '4px 12px' }}>
                    {alertSummary.expired} lô đã hết hạn!
                  </Tag>
                )}
                {alertSummary.expiring_7d > 0 && (
                  <Tag color="orange" style={{ fontSize: 14, padding: '4px 12px' }}>
                    {alertSummary.expiring_7d} lô hết hạn trong 7 ngày
                  </Tag>
                )}
                <Typography.Link onClick={() => navigate('/alerts')}>Xem chi tiết →</Typography.Link>
              </Space>
            </Card>
          </Col>
        </Row>
      )}

      <Row gutter={16}>
        {/* Hàng sắp hết hạn */}
        <Col xs={24} md={8}>
          <Card title={<Space><AlertOutlined style={{ color: '#cf1322' }} /> Sắp hết hạn</Space>} size="small">
            <Table
              dataSource={expiring.slice(0, 8)}
              rowKey="id"
              size="small"
              pagination={false}
              loading={loading}
              locale={{ emptyText: 'Không có hàng sắp hết hạn' }}
              columns={[
                { title: 'Sản phẩm', dataIndex: ['product', 'name'], ellipsis: true },
                {
                  title: 'Còn',
                  dataIndex: 'days_left',
                  width: 80,
                  align: 'right',
                  render: (d: number) => (
                    <Tag color={d <= 0 ? 'red' : d <= 3 ? 'orange' : 'gold'}>
                      {d <= 0 ? 'Hết hạn' : `${d} ngày`}
                    </Tag>
                  ),
                },
              ]}
            />
          </Card>
        </Col>

        {/* Hàng sắp hết kho */}
        <Col xs={24} md={8}>
          <Card title={<Space><WarningOutlined style={{ color: '#faad14' }} /> Sắp hết kho</Space>} size="small">
            <Table
              dataSource={lowStock.slice(0, 8)}
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
                  width: 90,
                  align: 'right',
                  render: (stock: number, record: LowStockItem) => (
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
        <Col xs={24} md={8}>
          <Card title={<Space><ShoppingCartOutlined /> Đơn gần đây</Space>} size="small">
            <Table
              dataSource={completedInvoices.slice(0, 8)}
              rowKey="id"
              size="small"
              pagination={false}
              loading={loading}
              locale={{ emptyText: 'Chưa có đơn hôm nay' }}
              columns={[
                { title: '#', dataIndex: 'id', width: 40 },
                {
                  title: 'Tổng',
                  dataIndex: 'final_total',
                  render: formatVND,
                  align: 'right',
                  width: 100,
                },
                {
                  title: 'Giờ',
                  dataIndex: 'created_at',
                  width: 60,
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
