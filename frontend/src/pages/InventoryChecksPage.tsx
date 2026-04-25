import { PlusOutlined, CheckOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import { Table, Button, message, Tag, Modal, InputNumber } from 'antd';
import React, { useState } from 'react';

import { PageHeader, EmptyState } from '../components/common';
import { useAuth } from '../contexts/useAuth';
import {
  useInventoryChecks,
  useInventoryCheck,
  useCreateInventoryCheck,
  useUpdateInventoryCheckItems,
  useConfirmInventoryCheck,
} from '../hooks';
import type { InventoryCheck } from '../types';
import { formatDateTime, getErrorMessage } from '../utils/format';

export default function InventoryChecksPage() {
  const { user } = useAuth();
  const [detailId, setDetailId] = useState<number | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editItems, setEditItems] = useState<
    { product_id: number; actual_quantity: number; note?: string }[]
  >([]);

  const { data: checks = [], isLoading } = useInventoryChecks();
  const { data: detailCheck } = useInventoryCheck(detailId);
  const createCheck = useCreateInventoryCheck();
  const updateItems = useUpdateInventoryCheckItems();
  const confirmCheck = useConfirmInventoryCheck();

  const handleCreate = () => {
    createCheck.mutate(undefined, {
      onSuccess: () => message.success('Đã tạo đợt kiểm kê'),
      onError: (err: unknown) => message.error(getErrorMessage(err)),
    });
  };

  const showDetail = (id: number) => {
    setDetailId(id);
    setEditMode(false);
  };

  const startEdit = () => {
    if (!detailCheck?.items) return;
    setEditItems(
      detailCheck.items.map(i => ({
        product_id: i.product_id,
        actual_quantity: i.actual_quantity,
        note: i.note || undefined,
      }))
    );
    setEditMode(true);
  };

  const saveItems = () => {
    if (!detailCheck) return;
    updateItems.mutate(
      { id: detailCheck.id, items: editItems },
      {
        onSuccess: () => {
          message.success('Đã lưu');
          setEditMode(false);
        },
        onError: (err: unknown) => message.error(getErrorMessage(err)),
      }
    );
  };

  const handleConfirm = (id: number) => {
    confirmCheck.mutate(id, {
      onSuccess: () => {
        message.success('Đã xác nhận kiểm kê — tồn kho đã điều chỉnh');
        setDetailId(null);
      },
      onError: (err: unknown) => message.error(getErrorMessage(err)),
    });
  };

  const columns = [
    { title: '#', dataIndex: 'id', width: 60 },
    { title: 'NV', dataIndex: ['user', 'name'], width: 120 },
    {
      title: 'TT',
      dataIndex: 'status',
      width: 110,
      render: (v: string) => (
        <Tag color={v === 'completed' ? 'green' : 'blue'}>
          {v === 'completed' ? 'Hoàn thành' : 'Nháp'}
        </Tag>
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      render: (v: string) => formatDateTime(v),
      width: 160,
    },
    {
      title: 'Hoàn thành',
      dataIndex: 'completed_at',
      width: 160,
      render: (v: string | null) => (v ? formatDateTime(v) : '—'),
    },
    {
      title: '',
      width: 80,
      render: (_: unknown, r: InventoryCheck) => (
        <Button icon={<EyeOutlined />} size="small" onClick={() => showDetail(r.id)}>
          Xem
        </Button>
      ),
    },
  ];

  const detailColumns = [
    { title: 'Sản phẩm', dataIndex: ['product', 'name'], ellipsis: true },
    { title: 'Hệ thống', dataIndex: 'system_quantity', width: 100, align: 'right' as const },
    {
      title: 'Thực tế',
      dataIndex: 'actual_quantity',
      width: 120,
      align: 'right' as const,
      render: (v: number, _: unknown, idx: number) =>
        editMode ? (
          <InputNumber
            size="small"
            value={editItems[idx]?.actual_quantity}
            min={0}
            onChange={val => {
              const n = [...editItems];
              n[idx] = { ...n[idx], actual_quantity: val || 0 };
              setEditItems(n);
            }}
          />
        ) : (
          v
        ),
    },
    {
      title: 'Chênh lệch',
      dataIndex: 'difference',
      width: 100,
      align: 'right' as const,
      render: (v: number) => (
        <Tag color={v === 0 ? 'default' : v > 0 ? 'green' : 'red'}>
          {v > 0 ? '+' : ''}
          {v}
        </Tag>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Kiểm kê kho"
        actionText="Tạo đợt kiểm kê"
        actionIcon={<PlusOutlined />}
        onAction={handleCreate}
      />
      <Table
        dataSource={checks}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20 }}
        size="middle"
        locale={{ emptyText: <EmptyState title="Chưa có đợt kiểm kê nào" /> }}
      />

      <Modal
        title={`Kiểm kê #${detailCheck?.id}`}
        open={!!detailId}
        onCancel={() => setDetailId(null)}
        width={800}
        footer={
          detailCheck?.status === 'draft'
            ? [
                !editMode && (
                  <Button key="edit" icon={<EditOutlined />} onClick={startEdit}>
                    Nhập SL thực tế
                  </Button>
                ),
                editMode && (
                  <Button key="save" type="primary" onClick={saveItems}>
                    Lưu
                  </Button>
                ),
                user?.role === 'admin' && (
                  <Button
                    key="confirm"
                    type="primary"
                    danger
                    icon={<CheckOutlined />}
                    onClick={() => handleConfirm(detailCheck!.id)}
                  >
                    Xác nhận & Điều chỉnh
                  </Button>
                ),
              ].filter(Boolean)
            : null
        }
      >
        <Table
          dataSource={detailCheck?.items}
          columns={detailColumns}
          rowKey="id"
          pagination={false}
          size="small"
          scroll={{ y: 400 }}
        />
      </Modal>
    </div>
  );
}
