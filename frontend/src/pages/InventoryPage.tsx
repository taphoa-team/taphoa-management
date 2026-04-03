import React, { useEffect, useState } from 'react';
import { Table, Typography, Tag, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import api from '../services/api';
import { InventoryItem } from '../types';

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (search) params.search = search;
      const res = await api.get('/inventory', { params });
      setItems(res.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchInventory(); }, [search]); // eslint-disable-line

  const formatVND = (v: number) => v.toLocaleString('vi-VN') + 'đ';

  const columns = [
    { title: 'SKU', dataIndex: 'sku', width: 100 },
    { title: 'Tên sản phẩm', dataIndex: 'name', ellipsis: true },
    { title: 'ĐVT', dataIndex: 'unit', width: 80 },
    { title: 'Giá bán', dataIndex: 'sell_price', width: 120, render: formatVND, align: 'right' as const },
    { title: 'Tồn tối thiểu', dataIndex: 'min_quantity', width: 120, align: 'right' as const },
    {
      title: 'Tồn kho', dataIndex: 'stock', width: 120, align: 'right' as const,
      render: (stock: number, r: InventoryItem) => {
        const color = r.warning === 'out' ? 'red' : r.warning === 'low' ? 'orange' : 'green';
        return <Tag color={color}>{stock}</Tag>;
      },
    },
    {
      title: 'Trạng thái', dataIndex: 'warning', width: 120,
      render: (w: string) => w === 'out' ? <Tag color="red">Hết hàng</Tag> : w === 'low' ? <Tag color="orange">Sắp hết</Tag> : <Tag color="green">OK</Tag>,
    },
  ];

  return (
    <div>
      <Typography.Title level={4}>Tồn kho</Typography.Title>
      <Input prefix={<SearchOutlined />} placeholder="Tìm sản phẩm..." value={search}
        onChange={(e) => setSearch(e.target.value)} allowClear style={{ width: 280, marginBottom: 16 }} />
      <Table dataSource={items} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 50 }} size="middle" />
    </div>
  );
}
