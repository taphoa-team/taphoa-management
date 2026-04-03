import React, { useEffect, useState } from 'react';
import { Table, Button, message, Typography, Tag, Modal, InputNumber } from 'antd';
import { PlusOutlined, CheckOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import api from '../services/api';
import { InventoryCheck } from '../types';
import { useAuth } from '../contexts/AuthContext';

export default function InventoryChecksPage() {
  const { user } = useAuth();
  const [checks, setChecks] = useState<InventoryCheck[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailCheck, setDetailCheck] = useState<InventoryCheck | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editItems, setEditItems] = useState<{ product_id: number; actual_quantity: number; note?: string }[]>([]);

  const fetchChecks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/inventory-checks');
      setChecks(res.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchChecks(); }, []);

  const handleCreate = async () => {
    try {
      await api.post('/inventory-checks');
      message.success('Đã tạo đợt kiểm kê');
      fetchChecks();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Lỗi');
    }
  };

  const showDetail = async (id: number) => {
    try {
      const res = await api.get(`/inventory-checks/${id}`);
      setDetailCheck(res.data);
      setEditMode(false);
    } catch { message.error('Không tải được'); }
  };

  const startEdit = () => {
    if (!detailCheck?.items) return;
    setEditItems(detailCheck.items.map((i) => ({
      product_id: i.product_id,
      actual_quantity: i.actual_quantity,
      note: i.note || undefined,
    })));
    setEditMode(true);
  };

  const saveItems = async () => {
    if (!detailCheck) return;
    try {
      await api.put(`/inventory-checks/${detailCheck.id}/items`, { items: editItems });
      message.success('Đã lưu');
      showDetail(detailCheck.id);
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Lỗi');
    }
  };

  const handleConfirm = async (id: number) => {
    try {
      await api.post(`/inventory-checks/${id}/confirm`);
      message.success('Đã xác nhận kiểm kê — tồn kho đã điều chỉnh');
      fetchChecks();
      setDetailCheck(null);
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Lỗi');
    }
  };

  const columns = [
    { title: '#', dataIndex: 'id', width: 60 },
    { title: 'NV', dataIndex: ['user', 'name'], width: 120 },
    {
      title: 'TT', dataIndex: 'status', width: 110,
      render: (v: string) => <Tag color={v === 'completed' ? 'green' : 'blue'}>{v === 'completed' ? 'Hoàn thành' : 'Nháp'}</Tag>,
    },
    { title: 'Ngày tạo', dataIndex: 'created_at', render: (v: string) => new Date(v).toLocaleString('vi-VN'), width: 160 },
    {
      title: 'Hoàn thành', dataIndex: 'completed_at', width: 160,
      render: (v: string | null) => v ? new Date(v).toLocaleString('vi-VN') : '—',
    },
    {
      title: '', width: 80,
      render: (_: any, r: InventoryCheck) => <Button icon={<EyeOutlined />} size="small" onClick={() => showDetail(r.id)}>Xem</Button>,
    },
  ];

  const detailColumns = [
    { title: 'Sản phẩm', dataIndex: ['product', 'name'], ellipsis: true },
    { title: 'Hệ thống', dataIndex: 'system_quantity', width: 100, align: 'right' as const },
    {
      title: 'Thực tế', dataIndex: 'actual_quantity', width: 120, align: 'right' as const,
      render: (v: number, _: any, idx: number) => editMode ? (
        <InputNumber size="small" value={editItems[idx]?.actual_quantity} min={0}
          onChange={(val) => { const n = [...editItems]; n[idx] = { ...n[idx], actual_quantity: val || 0 }; setEditItems(n); }} />
      ) : v,
    },
    {
      title: 'Chênh lệch', dataIndex: 'difference', width: 100, align: 'right' as const,
      render: (v: number) => <Tag color={v === 0 ? 'default' : v > 0 ? 'green' : 'red'}>{v > 0 ? '+' : ''}{v}</Tag>,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Kiểm kê kho</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>Tạo đợt kiểm kê</Button>
      </div>
      <Table dataSource={checks} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 20 }} size="middle" />

      <Modal title={`Kiểm kê #${detailCheck?.id}`} open={!!detailCheck} onCancel={() => setDetailCheck(null)}
        width={800} footer={detailCheck?.status === 'draft' ? [
          !editMode && <Button key="edit" icon={<EditOutlined />} onClick={startEdit}>Nhập SL thực tế</Button>,
          editMode && <Button key="save" type="primary" onClick={saveItems}>Lưu</Button>,
          user?.role === 'admin' && <Button key="confirm" type="primary" danger icon={<CheckOutlined />}
            onClick={() => handleConfirm(detailCheck!.id)}>Xác nhận & Điều chỉnh</Button>,
        ].filter(Boolean) : null}>
        <Table dataSource={detailCheck?.items} columns={detailColumns} rowKey="id" pagination={false} size="small" scroll={{ y: 400 }} />
      </Modal>
    </div>
  );
}
