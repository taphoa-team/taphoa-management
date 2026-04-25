import { EyeOutlined, StopOutlined } from '@ant-design/icons';
import { Table, Tag, DatePicker, Space, Button, message, Popconfirm } from 'antd';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { PageHeader, EmptyState } from '../components/common';
import { PAYMENT_LABEL_SHORT } from '../constants';
import { useAuth } from '../contexts/useAuth';
import { useInvoices, useCancelInvoice } from '../hooks';
import type { Invoice } from '../types';
import { formatVND, formatDateTime, getErrorMessage } from '../utils/format';

export default function InvoicesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [date, setDate] = useState<string>('');

  const { data: invoices = [], isLoading } = useInvoices({
    page,
    limit: 20,
    date: date || undefined,
  });

  const cancelInvoice = useCancelInvoice();

  const handleCancel = async (id: number) => {
    try {
      await cancelInvoice.mutateAsync(id);
      message.success('Đã hủy đơn');
    } catch (err: unknown) {
      message.error(getErrorMessage(err, 'Không hủy được'));
    }
  };

  const columns = [
    { title: '#', dataIndex: 'id', width: 60 },
    { title: 'Nhân viên', dataIndex: ['user', 'name'], width: 120 },
    { title: 'Khách', render: (_: unknown, r: Invoice) => r.customer?.name || '—', width: 120 },
    {
      title: 'Tổng',
      dataIndex: 'final_total',
      render: formatVND,
      align: 'right' as const,
      width: 120,
    },
    {
      title: 'Thanh toán',
      dataIndex: 'payment_method',
      render: (v: string) => PAYMENT_LABEL_SHORT[v] || v,
      width: 100,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 110,
      render: (v: string) => (
        <Tag color={v === 'completed' ? 'green' : 'red'}>
          {v === 'completed' ? 'Hoàn thành' : 'Đã hủy'}
        </Tag>
      ),
    },
    {
      title: 'Ngày',
      dataIndex: 'created_at',
      render: (v: string) => formatDateTime(v),
      width: 160,
    },
    {
      title: 'Thao tác',
      width: 160,
      render: (_: unknown, r: Invoice) => (
        <Space>
          <Button icon={<EyeOutlined />} size="small" onClick={() => navigate(`/invoices/${r.id}`)}>
            Xem
          </Button>
          {user?.role === 'admin' && r.status === 'completed' && (
            <Popconfirm title="Hủy đơn hàng này?" onConfirm={() => handleCancel(r.id)}>
              <Button icon={<StopOutlined />} size="small" danger>
                Hủy
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Đơn hàng" />
      <Space style={{ marginBottom: 16 }}>
        <DatePicker
          placeholder="Lọc theo ngày"
          onChange={d => {
            setDate(d ? d.format('YYYY-MM-DD') : '');
            setPage(1);
          }}
        />
      </Space>
      <Table
        dataSource={invoices}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ current: page, pageSize: 20, onChange: setPage, showSizeChanger: false }}
        size="middle"
        locale={{ emptyText: <EmptyState title="Chưa có hóa đơn nào" /> }}
      />
    </div>
  );
}
