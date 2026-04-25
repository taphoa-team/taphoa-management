import {
  DollarOutlined,
  ShoppingCartOutlined,
  RiseOutlined,
  PercentageOutlined,
  DownloadOutlined,
  FireOutlined,
} from '@ant-design/icons';
import {
  Card,
  Tabs,
  message,
  Segmented,
  DatePicker,
  Row,
  Col,
  Statistic,
  Table,
  Typography,
  Space,
  Button,
} from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import React, { useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from 'recharts';

import { PageHeader } from '../components/common';
import { useRevenueReport, useProfitReport, useCompareReport, useTopProducts } from '../hooks';
import api from '../services/api';
import type { TopProductItem } from '../types';
import { formatVND } from '../utils/format';

const { RangePicker } = DatePicker;
type QuickRange = 'today' | 'week' | 'month' | 'custom';

function downloadExcel(url: string) {
  api
    .get(url, { responseType: 'blob' })
    .then(res => {
      const disposition = res.headers['content-disposition'] || '';
      const match = disposition.match(/filename="?(.+?)"?$/);
      const filename = match?.[1] || 'report.xlsx';
      const blobUrl = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(blobUrl);
    })
    .catch(() => message.error('Lỗi xuất Excel'));
}

function getDateRange(quick: QuickRange): [Dayjs, Dayjs] {
  const today = dayjs();
  switch (quick) {
    case 'today':
      return [today, today];
    case 'week':
      return [today.startOf('week'), today];
    case 'month':
      return [today.startOf('month'), today];
    default:
      return [today, today];
  }
}

const vndFormatter = (value: unknown) => formatVND(typeof value === 'number' ? value : 0);
const formatChartDate = (dateStr: string) => dayjs(dateStr).format('DD/MM');
const yAxisFormatter = (v: unknown) => {
  const n = typeof v === 'number' ? v : 0;
  return n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${n / 1000}K` : `${n}`;
};

// --- Shared hook for date range filter ---

function useDateRangeFilter(defaultQuick: QuickRange = 'month') {
  const [quick, setQuick] = useState<QuickRange>(defaultQuick);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>(getDateRange(defaultQuick));

  const handleQuickChange = useCallback((val: string | number) => {
    const q = val as QuickRange;
    setQuick(q);
    if (q !== 'custom') {
      setDateRange(getDateRange(q));
    }
  }, []);

  const handleRangeChange = useCallback((_dates: unknown, dateStrings: [string, string]) => {
    const from = dayjs(dateStrings[0], 'DD/MM/YYYY');
    const to = dayjs(dateStrings[1], 'DD/MM/YYYY');
    if (from.isValid() && to.isValid()) {
      setDateRange([from, to]);
    }
  }, []);

  return { quick, dateRange, handleQuickChange, handleRangeChange };
}

// --- Shared DateRangeControls component ---

function DateRangeControls({
  quick,
  dateRange,
  handleQuickChange,
  handleRangeChange,
  quickOptions,
}: {
  quick: QuickRange;
  dateRange: [Dayjs, Dayjs];
  handleQuickChange: (val: string | number) => void;
  handleRangeChange: (_dates: unknown, dateStrings: [string, string]) => void;
  quickOptions?: { label: string; value: string }[];
}) {
  const options = quickOptions ?? [
    { label: 'Hôm nay', value: 'today' },
    { label: 'Tuần này', value: 'week' },
    { label: 'Tháng này', value: 'month' },
    { label: 'Tùy chọn', value: 'custom' },
  ];

  return (
    <Space wrap>
      <Segmented value={quick} onChange={handleQuickChange} options={options} />
      {quick === 'custom' && (
        <RangePicker
          value={dateRange}
          onChange={handleRangeChange as React.ComponentProps<typeof RangePicker>['onChange']}
          format="DD/MM/YYYY"
        />
      )}
    </Space>
  );
}

// ─── Tab 1: RevenueTab ────────────────────────────────────────────────────────

function RevenueTab() {
  const { quick, dateRange, handleQuickChange, handleRangeChange } = useDateRangeFilter('month');

  const fromStr = dateRange[0].format('YYYY-MM-DD');
  const toStr = dateRange[1].format('YYYY-MM-DD');
  const { data: revenue, isLoading: loadingRevenue } = useRevenueReport(fromStr, toStr);
  const { data: profit = [], isLoading: loadingProfit } = useProfitReport(fromStr, toStr);
  const loading = loadingRevenue || loadingProfit;

  const barData = (revenue?.daily ?? []).map(d => ({
    date: formatChartDate(d.date),
    'Doanh thu': d.revenue,
  }));

  const areaData = profit.map(d => ({
    date: formatChartDate(d.date),
    'Lợi nhuận': d.profit,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Date picker row */}
      <Card size="small">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <DateRangeControls
            quick={quick}
            dateRange={dateRange}
            handleQuickChange={handleQuickChange}
            handleRangeChange={handleRangeChange}
          />
          <Button
            icon={<DownloadOutlined />}
            onClick={() =>
              downloadExcel(
                `/reports/revenue/export?from=${dateRange[0].format('YYYY-MM-DD')}&to=${dateRange[1].format('YYYY-MM-DD')}`
              )
            }
          >
            Xuất Excel
          </Button>
        </div>
      </Card>

      {/* 5 stat cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8} lg={8} xl={4} xxl={4}>
          <Card loading={loading}>
            <Statistic
              title="Doanh thu"
              value={revenue?.total_revenue ?? 0}
              formatter={v => formatVND(v as number)}
              valueStyle={{ color: '#0d9488', fontSize: 20 }}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={8} xl={4} xxl={4}>
          <Card loading={loading}>
            <Statistic
              title="Giá vốn"
              value={revenue?.total_cogs ?? 0}
              formatter={v => formatVND(v as number)}
              valueStyle={{ color: '#6b7280', fontSize: 20 }}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={8} xl={4} xxl={4}>
          <Card loading={loading}>
            <Statistic
              title="Lợi nhuận"
              value={revenue?.total_profit ?? 0}
              formatter={v => formatVND(v as number)}
              valueStyle={{ color: '#22c55e', fontSize: 20 }}
              prefix={<RiseOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={8} xl={6} xxl={6}>
          <Card loading={loading}>
            <Statistic
              title="Số hóa đơn"
              value={revenue?.invoice_count ?? 0}
              valueStyle={{ color: '#0d9488', fontSize: 20 }}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={8} xl={6} xxl={6}>
          <Card loading={loading}>
            <Statistic
              title="Tổng giảm giá"
              value={revenue?.total_discount ?? 0}
              formatter={v => formatVND(v as number)}
              valueStyle={{ color: '#f59e0b', fontSize: 20 }}
              prefix={<PercentageOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Bar chart: doanh thu theo ngày */}
      <Card title="Doanh thu theo ngày" loading={loading}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={barData} margin={{ top: 16, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={yAxisFormatter} />
            <Tooltip formatter={vndFormatter} />
            <Bar
              dataKey="Doanh thu"
              fill="#0d9488"
              radius={[4, 4, 0, 0]}
              label={{ position: 'top', formatter: yAxisFormatter, fontSize: 11 }}
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Area chart: lợi nhuận theo ngày */}
      <Card title="Lợi nhuận theo ngày" loading={loading}>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={areaData} margin={{ top: 16, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={yAxisFormatter} />
            <Tooltip formatter={vndFormatter} />
            <Area
              type="monotone"
              dataKey="Lợi nhuận"
              stroke="#22c55e"
              fill="#bbf7d0"
              dot={{ r: 3 }}
              label={{ position: 'top', formatter: yAxisFormatter, fontSize: 11 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

// ─── Shared components ──────────────────────────────────────────────────────

function ChangeTag({ pct }: { pct: number }) {
  const isPos = pct >= 0;
  return (
    <Typography.Text style={{ color: isPos ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
      {isPos ? `+${pct}%↑` : `${pct}%↓`}
    </Typography.Text>
  );
}

// ─── Tab 2: CompareTab ────────────────────────────────────────────────────────

function CompareTab() {
  const { data, isLoading: loading } = useCompareReport();

  const pctChange = (curr: number, prev: number): number => {
    if (prev === 0) return 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const barData = (data?.weekly ?? []).map(w => ({
    Tuần: `Tuần ${w.week}`,
    'Kỳ trước': w.previous_revenue,
    'Kỳ này': w.current_revenue,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 3 summary cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card loading={loading} title="Doanh thu">
            <Space direction="vertical" size={4}>
              <Typography.Text type="secondary">
                {formatVND(data?.previous.revenue ?? 0)} → {formatVND(data?.current.revenue ?? 0)}
              </Typography.Text>
              <ChangeTag pct={pctChange(data?.current.revenue ?? 0, data?.previous.revenue ?? 0)} />
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card loading={loading} title="Lợi nhuận">
            <Space direction="vertical" size={4}>
              <Typography.Text type="secondary">
                {formatVND(data?.previous.profit ?? 0)} → {formatVND(data?.current.profit ?? 0)}
              </Typography.Text>
              <ChangeTag pct={pctChange(data?.current.profit ?? 0, data?.previous.profit ?? 0)} />
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card loading={loading} title="Số hóa đơn">
            <Space direction="vertical" size={4}>
              <Typography.Text type="secondary">
                {data?.previous.invoice_count ?? 0} → {data?.current.invoice_count ?? 0}
              </Typography.Text>
              <ChangeTag
                pct={pctChange(data?.current.invoice_count ?? 0, data?.previous.invoice_count ?? 0)}
              />
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Export button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button
          icon={<DownloadOutlined />}
          onClick={() => downloadExcel('/reports/compare/export')}
        >
          Xuất Excel
        </Button>
      </div>

      {/* Grouped BarChart */}
      <Card title="So sánh doanh thu theo tuần" loading={loading}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={barData} margin={{ top: 16, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="Tuần" />
            <YAxis tickFormatter={yAxisFormatter} />
            <Tooltip formatter={vndFormatter} />
            <Legend />
            <Bar dataKey="Kỳ trước" fill="#9ca3af" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Kỳ này" fill="#0d9488" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

// ─── Tab 3: TopProductsTab ────────────────────────────────────────────────────

function TopProductsTab() {
  const [sortMode, setSortMode] = useState<'desc' | 'asc'>('desc');
  const { quick, dateRange, handleQuickChange, handleRangeChange } = useDateRangeFilter('month');

  const fromStr = dateRange[0].format('YYYY-MM-DD');
  const toStr = dateRange[1].format('YYYY-MM-DD');
  const { data = [], isLoading: loading } = useTopProducts(fromStr, toStr, sortMode);

  const rankColors: Record<number, string> = { 1: '#facc15', 2: '#9ca3af', 3: '#f97316' };

  const columns = [
    {
      title: '#',
      key: 'rank',
      width: 48,
      render: (_: unknown, __: TopProductItem, index: number) => {
        const rank = index + 1;
        const color = rankColors[rank];
        return color ? (
          <Typography.Text strong style={{ color }}>
            {rank}
          </Typography.Text>
        ) : (
          <Typography.Text type="secondary">{rank}</Typography.Text>
        );
      },
    },
    {
      title: 'Sản phẩm',
      dataIndex: 'product_name',
      key: 'product_name',
    },
    {
      title: 'SL bán',
      dataIndex: 'total_qty',
      key: 'total_qty',
      render: (v: number) => <Typography.Text strong>{v}</Typography.Text>,
    },
    {
      title: 'Doanh thu',
      dataIndex: 'revenue',
      key: 'revenue',
      render: (v: number) => formatVND(v),
    },
    {
      title: 'Lợi nhuận',
      dataIndex: 'profit',
      key: 'profit',
      render: (v: number) => (
        <Typography.Text strong style={{ color: '#22c55e' }}>
          {formatVND(v)}
        </Typography.Text>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Controls */}
      <Card size="small">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space wrap>
            <Segmented
              value={sortMode}
              onChange={v => setSortMode(v as 'desc' | 'asc')}
              options={[
                { label: 'Bán chạy', value: 'desc' },
                { label: 'Bán ế', value: 'asc' },
              ]}
            />
            <DateRangeControls
              quick={quick}
              dateRange={dateRange}
              handleQuickChange={handleQuickChange}
              handleRangeChange={handleRangeChange}
              quickOptions={[
                { label: 'Tuần này', value: 'week' },
                { label: 'Tháng này', value: 'month' },
                { label: 'Tùy chọn', value: 'custom' },
              ]}
            />
          </Space>
          <Button
            icon={<DownloadOutlined />}
            onClick={() =>
              downloadExcel(
                `/reports/top-products/export?from=${dateRange[0].format('YYYY-MM-DD')}&to=${dateRange[1].format('YYYY-MM-DD')}&sort=${sortMode}`
              )
            }
          >
            Xuất Excel
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <Table
          dataSource={data}
          columns={columns}
          rowKey="product_id"
          loading={loading}
          pagination={false}
          size="middle"
        />
      </Card>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function ReportsPage() {
  return (
    <div>
      <PageHeader title="Báo cáo" />
      <Tabs
        defaultActiveKey="revenue"
        destroyInactiveTabPane
        items={[
          {
            key: 'revenue',
            label: (
              <span>
                <DollarOutlined /> Doanh thu
              </span>
            ),
            children: <RevenueTab />,
          },
          {
            key: 'compare',
            label: (
              <span>
                <RiseOutlined /> So sánh
              </span>
            ),
            children: <CompareTab />,
          },
          {
            key: 'top-products',
            label: (
              <span>
                <FireOutlined /> Top sản phẩm
              </span>
            ),
            children: <TopProductsTab />,
          },
        ]}
      />
    </div>
  );
}
