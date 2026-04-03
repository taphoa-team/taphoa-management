import React, { useEffect, useState } from 'react';
import { Table, Typography, Tag, Button } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Customer } from '../types';

export default function DebtsPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get('/debts/summary').then((r) => setCustomers(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const formatVND = (v: number) => v.toLocaleString('vi-VN') + 'đ';

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
      <Typography.Title level={4}>Công nợ khách hàng</Typography.Title>
      <Table dataSource={customers} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 20 }} size="middle" />
    </div>
  );
}
