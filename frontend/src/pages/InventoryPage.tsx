import { SearchOutlined } from '@ant-design/icons';
import { Table, Tag, Input } from 'antd';
import React, { useState } from 'react';

import { PageHeader, EmptyState } from '../components/common';
import { DEBOUNCE_DELAY } from '../constants';
import { useDebounce, useInventory } from '../hooks';
import type { InventoryItem } from '../types';
import { formatVND } from '../utils/format';

export default function InventoryPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, DEBOUNCE_DELAY);

  const { data: items = [], isLoading } = useInventory(debouncedSearch || undefined);

  const columns = [
    { title: 'SKU', dataIndex: 'sku', width: 100 },
    { title: 'Tên sản phẩm', dataIndex: 'name', ellipsis: true },
    { title: 'ĐVT', dataIndex: 'unit', width: 80 },
    {
      title: 'Giá bán',
      dataIndex: 'sell_price',
      width: 120,
      render: formatVND,
      align: 'right' as const,
    },
    { title: 'Tồn tối thiểu', dataIndex: 'min_quantity', width: 120, align: 'right' as const },
    {
      title: 'Tồn kho',
      dataIndex: 'stock',
      width: 120,
      align: 'right' as const,
      render: (stock: number, r: InventoryItem) => {
        const color = r.warning === 'out' ? 'red' : r.warning === 'low' ? 'orange' : 'green';
        return <Tag color={color}>{stock}</Tag>;
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'warning',
      width: 120,
      render: (w: string) =>
        w === 'out' ? (
          <Tag color="red">Hết hàng</Tag>
        ) : w === 'low' ? (
          <Tag color="orange">Sắp hết</Tag>
        ) : (
          <Tag color="green">OK</Tag>
        ),
    },
  ];

  return (
    <div>
      <PageHeader title="Tồn kho" />
      <Input
        prefix={<SearchOutlined />}
        placeholder="Tìm sản phẩm..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        allowClear
        style={{ width: 280, marginBottom: 16 }}
      />
      <Table
        dataSource={items}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 50 }}
        size="middle"
        locale={{ emptyText: <EmptyState title="Chưa có sản phẩm trong kho" /> }}
      />
    </div>
  );
}
