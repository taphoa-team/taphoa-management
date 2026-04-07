import React, { useEffect, useState, useCallback } from 'react';
import { Table, Tag, DatePicker, Space, Button, message, Popconfirm } from 'antd';
import { EyeOutlined, StopOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Invoice } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { formatVND } from '../utils/format';
import { PageHeader } from '../components/common';

export default function InvoicesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [date, setDate] = useState<string>('');

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (date) params.date = date;
      const res = await api.get('/invoices', { params });
      setInvoices(res.data || []);
    } catch { message.error('Lỗi tải dữ liệu'); }
    setLoading(false);
  }, [page, date]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const handleCancel = async (id: number) => {
    try {
      await api.patch(`/invoices/${id}/cancel`);
      message.success('Đã hủy đơn');
      fetchInvoices();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Không hủy được');
    }
  };

  const paymentLabel: Record<string, string> = { cash: 'Tiền mặt', transfer: 'CK', mixed: 'TM+CK', debt: 'Nợ' };

  const columns = [
    { title: '#', dataIndex: 'id', width: 60 },
    { title: 'Nhân viên', dataIndex: ['user', 'name'], width: 120 },
    { title: 'Khách', render: (_: any, r: Invoice) => r.customer?.name || '—', width: 120 },
    { title: 'Tổng', dataIndex: 'final_total', render: formatVND, align: 'right' as const, width: 120 },
    { title: 'Thanh toán', dataIndex: 'payment_method', render: (v: string) => paymentLabel[v] || v, width: 100 },
    {
      title: 'Trạng thái', dataIndex: 'status', width: 110,
      render: (v: string) => <Tag color={v === 'completed' ? 'green' : 'red'}>{v === 'completed' ? 'Hoàn thành' : 'Đã hủy'}</Tag>,
    },
    { title: 'Ngày', dataIndex: 'created_at', render: (v: string) => new Date(v).toLocaleString('vi-VN'), width: 160 },
    {
      title: 'Thao tác', width: 160,
      render: (_: any, r: Invoice) => (
        <Space>
          <Button icon={<EyeOutlined />} size="small" onClick={() => navigate(`/invoices/${r.id}`)}>Xem</Button>
          {user?.role === 'admin' && r.status === 'completed' && (
            <Popconfirm title="Hủy đơn hàng này?" onConfirm={() => handleCancel(r.id)}>
              <Button icon={<StopOutlined />} size="small" danger>Hủy</Button>
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
        <DatePicker placeholder="Lọc theo ngày" onChange={(d) => { setDate(d ? d.format('YYYY-MM-DD') : ''); setPage(1); }} />
      </Space>
      <Table dataSource={invoices} columns={columns} rowKey="id" loading={loading}
        pagination={{ current: page, pageSize: 20, onChange: setPage, showSizeChanger: false }} size="middle" />
    </div>
  );
}
