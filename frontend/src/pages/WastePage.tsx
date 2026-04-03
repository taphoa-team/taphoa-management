import React, { useEffect, useState, useCallback } from 'react';
import { Table, Button, Modal, Form, Select, InputNumber, Input, message, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import api from '../services/api';
import { WasteRecord, Product, ProductBatch } from '../types';
import { formatVND } from '../utils/format';

export default function WastePage() {
  const [records, setRecords] = useState<WasteRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [form] = Form.useForm();

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/waste', { params: { page, limit: 20 } });
      setRecords(res.data || []);
    } catch { message.error('Lỗi tải dữ liệu'); }
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  useEffect(() => {
    api.get('/products', { params: { limit: 100 } }).then((r) => setProducts(r.data || [])).catch(() => message.error('Lỗi tải dữ liệu'));
  }, []);

  const onProductChange = async (productId: number) => {
    form.setFieldValue('batch_id', undefined);
    try {
      const res = await api.get(`/products/${productId}/batches`);
      setBatches(res.data || []);
    } catch { setBatches([]); }
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      await api.post('/waste', values);
      message.success('Đã tạo phiếu hủy');
      setModalOpen(false);
      form.resetFields();
      fetchRecords();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Lỗi');
    }
  };

  const reasonLabels: Record<string, string> = { expired: 'Hết hạn', damaged: 'Hư hỏng', other: 'Khác' };

  const columns = [
    { title: '#', dataIndex: 'id', width: 60 },
    { title: 'Sản phẩm', dataIndex: ['product', 'name'] },
    { title: 'SL', dataIndex: 'quantity', width: 60, align: 'right' as const },
    { title: 'Lý do', dataIndex: 'reason', width: 100, render: (v: string) => reasonLabels[v] || v },
    { title: 'NV', dataIndex: ['user', 'name'], width: 120 },
    { title: 'Ghi chú', dataIndex: 'note', ellipsis: true },
    { title: 'Ngày', dataIndex: 'created_at', render: (v: string) => new Date(v).toLocaleDateString('vi-VN'), width: 110 },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Xuất hủy</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setBatches([]); setModalOpen(true); }}>Tạo phiếu hủy</Button>
      </div>
      <Table dataSource={records} columns={columns} rowKey="id" loading={loading}
        pagination={{ current: page, pageSize: 20, onChange: setPage, showSizeChanger: false }} size="middle" />

      <Modal title="Tạo phiếu xuất hủy" open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)} okText="Tạo" cancelText="Hủy">
        <Form form={form} layout="vertical">
          <Form.Item name="product_id" label="Sản phẩm" rules={[{ required: true, message: 'Chọn SP' }]}>
            <Select placeholder="Chọn SP" showSearch onChange={onProductChange}
              options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }))}
              filterOption={(input, option) => (option?.label as string)?.toLowerCase().includes(input.toLowerCase())} />
          </Form.Item>
          <Form.Item name="batch_id" label="Lô hàng" rules={[{ required: true, message: 'Chọn lô' }]}>
            <Select placeholder="Chọn lô" options={batches.map((b) => ({
              value: b.id, label: `Lô #${b.id} — SL: ${b.quantity} — Giá: ${formatVND(b.cost_price)}${b.expiry_date ? ` — HSD: ${new Date(b.expiry_date).toLocaleDateString('vi-VN')}` : ''}`,
            }))} />
          </Form.Item>
          <Form.Item name="quantity" label="Số lượng hủy" rules={[{ required: true, message: 'Nhập SL' }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="reason" label="Lý do" rules={[{ required: true, message: 'Chọn lý do' }]}>
            <Select options={[{ value: 'expired', label: 'Hết hạn' }, { value: 'damaged', label: 'Hư hỏng' }, { value: 'other', label: 'Khác' }]} />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
