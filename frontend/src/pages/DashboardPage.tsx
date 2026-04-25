import {
  ShoppingCartOutlined,
  DollarOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  AlertOutlined,
} from '@ant-design/icons';
import { Card, Row, Col, Typography, Table, Tag, Statistic, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/useAuth';
import {
  useTodayInvoices,
  useCurrentShift,
  useAlertSummary,
  useLowStockAlerts,
  useExpiryAlerts,
} from '../hooks';
import type { Invoice } from '../types';
import { formatVND } from '../utils/format';

/**
 * DashboardPage - Trang tổng quan
 *
 * 🚀 Đã optimize với:
 * - React.memo để tránh re-render không cần thiết
 * - useMemo cho các tính toán và table columns
 */
function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // 🚀 React Query - Tự động caching, loading, error handling
  const { data: todayInvoices = [], isLoading: loadingInvoices } = useTodayInvoices();
  const { data: currentShift, isLoading: loadingShift } = useCurrentShift();
  const { data: alertSummary, isLoading: loadingSummary } = useAlertSummary();
  const { data: lowStock = [], isLoading: loadingLowStock } = useLowStockAlerts();
  const { data: expiring = [], isLoading: loadingExpiring } = useExpiryAlerts(7, 10);

  // 🎯 Memoize các tính toán - chỉ tính lại khi data thay đổi
  const completedInvoices = useMemo(
    () => todayInvoices.filter(i => i.status === 'completed'),
    [todayInvoices]
  );

  const todayRevenue = useMemo(
    () => completedInvoices.reduce((sum, i) => sum + i.final_total, 0),
    [completedInvoices]
  );

  const totalAlerts = useMemo(
    () =>
      alertSummary
        ? alertSummary.expired +
          alertSummary.expiring_7d +
          alertSummary.low_stock +
          alertSummary.out_of_stock
        : 0,
    [alertSummary]
  );

  // 🎯 Memoize table columns - tránh tạo mới mỗi render
  const expiryColumns = useMemo(
    () => [
      { title: 'Sản phẩm', dataIndex: ['product', 'name'], ellipsis: true },
      {
        title: 'Còn',
        dataIndex: 'days_left',
        width: 80,
        align: 'right' as const,
        render: (d: number) => (
          <Tag color={d <= 0 ? 'red' : d <= 3 ? 'orange' : 'gold'}>
            {d <= 0 ? 'Hết hạn' : `${d} ngày`}
          </Tag>
        ),
      },
    ],
    []
  );

  const lowStockColumns = useMemo(
    () => [
      { title: 'Sản phẩm', dataIndex: 'name', ellipsis: true },
      {
        title: 'Tồn kho',
        dataIndex: 'stock',
        width: 90,
        align: 'right' as const,
        render: (stock: number, record: { warning: string; unit: string }) => (
          <Tag color={record.warning === 'out' ? 'red' : 'orange'}>
            {stock} {record.unit}
          </Tag>
        ),
      },
    ],
    []
  );

  const recentInvoiceColumns = useMemo<ColumnsType<Invoice>>(
    () => [
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
        render: (v: string) =>
          new Date(v).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      },
    ],
    []
  );

  return (
    <div>
      <Typography.Title level={4} style={{ marginBottom: 24 }}>
        Xin chào, {user?.name}!
      </Typography.Title>

      {/* Thống kê nhanh */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card loading={loadingInvoices}>
            <Statistic
              title="Đơn hôm nay"
              value={completedInvoices.length}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card loading={loadingInvoices}>
            <Statistic
              title="Doanh thu hôm nay"
              value={todayRevenue}
              prefix={<DollarOutlined />}
              formatter={v => formatVND(v as number)}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card loading={loadingSummary} hoverable onClick={() => navigate('/alerts')}>
            <Statistic
              title="Cảnh báo"
              value={totalAlerts}
              prefix={<AlertOutlined />}
              valueStyle={totalAlerts > 0 ? { color: '#cf1322' } : undefined}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card loading={loadingShift}>
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
                <Typography.Link onClick={() => navigate('/alerts')}>
                  Xem chi tiết →
                </Typography.Link>
              </Space>
            </Card>
          </Col>
        </Row>
      )}

      <Row gutter={16}>
        {/* Hàng sắp hết hạn */}
        <Col xs={24} md={8}>
          <Card
            title={
              <Space>
                <AlertOutlined style={{ color: '#cf1322' }} /> Sắp hết hạn
              </Space>
            }
            size="small"
          >
            <Table
              dataSource={expiring.slice(0, 8)}
              rowKey="id"
              size="small"
              pagination={false}
              loading={loadingExpiring}
              locale={{ emptyText: 'Không có hàng sắp hết hạn' }}
              columns={expiryColumns}
            />
          </Card>
        </Col>

        {/* Hàng sắp hết */}
        <Col xs={24} md={8}>
          <Card
            title={
              <Space>
                <WarningOutlined style={{ color: '#faad14' }} /> Sắp hết hàng
              </Space>
            }
            size="small"
          >
            <Table
              dataSource={lowStock.slice(0, 8)}
              rowKey="id"
              size="small"
              pagination={false}
              loading={loadingLowStock}
              locale={{ emptyText: 'Không có hàng nào sắp hết' }}
              columns={lowStockColumns}
            />
          </Card>
        </Col>

        {/* Đơn hàng gần đây */}
        <Col xs={24} md={8}>
          <Card
            title={
              <Space>
                <ShoppingCartOutlined /> Đơn gần đây
              </Space>
            }
            size="small"
          >
            <Table
              dataSource={completedInvoices.slice(0, 8)}
              rowKey="id"
              size="small"
              pagination={false}
              loading={loadingInvoices}
              locale={{ emptyText: 'Chưa có đơn hôm nay' }}
              columns={recentInvoiceColumns}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default memo(DashboardPage);
