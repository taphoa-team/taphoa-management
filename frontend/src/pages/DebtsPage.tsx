import React, { useEffect, useState } from 'react';
import { Table, Tag, Button, message } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Customer } from '../types';
import { formatVND } from '../utils/format';
import { PageHeader, EmptyState } from '../components/common';

export default function DebtsPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get('/debts/summary').then((r) => setCustomers(r.data || [])).catch(() => message.error('Lỗi tải dữ liệu')).finally(() => setLoading(false));
  }, []);

  const columns = [
    { title: 'Tên', dataIndex: 'name' },
    { title: 'SĐT', dataIndex: 'phone', width: 130 },
    { title: 'Tổng nợ', dataIndex: 'total_debt', render: (v: number) => <Tag color="red">{formatVND(v)}</Tag>, align: 'right' as const, width: 150 },
    {
      title: '', width: 100,
      render: (_: any, r: Customer) => <Button icon={<EyeOutlined />} size="small" onClick={() => navigate(`/customers/${r.id}`)}>Chi tiết</Button>,
    },
  ];

  return (
    <div>
      <PageHeader title="Công nợ khách hàng" />
      <Table dataSource={customers} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 20 }} size="middle" locale={{ emptyText: <EmptyState title="Không có khách hàng nợ" /> }} />
    </div>
  );
}
