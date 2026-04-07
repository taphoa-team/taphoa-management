import React, { useEffect, useState, useCallback } from 'react';
import { Table, Button, Modal, Form, Select, InputNumber, Input, DatePicker, message, Tag, Space, Typography } from 'antd';
import { PlusOutlined, MinusCircleOutlined, EyeOutlined } from '@ant-design/icons';
import api from '../services/api';
import { PurchaseOrder, Supplier, Product } from '../types';
import { formatVND } from '../utils/format';
import { PageHeader } from '../components/common';

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState<PurchaseOrder | null>(null);
  const [page, setPage] = useState(1);
  const [form] = Form.useForm();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/purchase-orders', { params: { page, limit: 20 } });
      setOrders(res.data || []);
    } catch { message.error('Lỗi tải dữ liệu'); }
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    api.get('/suppliers').then((r) => setSuppliers(r.data || [])).catch(() => message.error('Lỗi tải dữ liệu'));
    api.get('/products', { params: { limit: 100 } }).then((r) => setProducts(r.data || [])).catch(() => message.error('Lỗi tải dữ liệu'));
  }, []);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      await api.post('/purchase-orders', {
        supplier_id: values.supplier_id,
        paid: values.paid || 0,
        note: values.note,
        items: values.items.map((item: any) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit: item.unit || '',
          cost_price: item.cost_price,
          expiry_date: item.expiry_date ? item.expiry_date.format('YYYY-MM-DD') : undefined,
        })),
      });
      message.success('Đã tạo đơn nhập');
      setModalOpen(false);
      form.resetFields();
      fetchOrders();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Lỗi');
    }
  };

  const showDetail = async (id: number) => {
    try {
      const res = await api.get(`/purchase-orders/${id}`);
      setDetailModal(res.data);
    } catch { message.error('Không tải được chi tiết'); }
  };

  const columns = [
    { title: '#', dataIndex: 'id', width: 60 },
    { title: 'NCC', dataIndex: ['supplier', 'name'], width: 150 },
    { title: 'Nhân viên', dataIndex: ['user', 'name'], width: 120 },
    { title: 'Tổng', dataIndex: 'total', render: formatVND, align: 'right' as const, width: 130 },
    { title: 'Đã trả', dataIndex: 'paid', render: formatVND, align: 'right' as const, width: 130 },
    {
      title: 'TT', dataIndex: 'status', width: 100,
      render: (v: string) => <Tag color={v === 'completed' ? 'green' : 'red'}>{v}</Tag>,
    },
    { title: 'Ngày', dataIndex: 'created_at', render: (v: string) => new Date(v).toLocaleDateString('vi-VN'), width: 110 },
    {
      title: '', width: 80,
      render: (_: any, r: PurchaseOrder) => (
        <Button icon={<EyeOutlined />} size="small" onClick={() => showDetail(r.id)}>Xem</Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Nhập hàng"
        actionText="Tạo đơn nhập"
        actionIcon={<PlusOutlined />}
        onAction={() => { form.resetFields(); setModalOpen(true); }}
      />
      <Table dataSource={orders} columns={columns} rowKey="id" loading={loading}
        pagination={{ current: page, pageSize: 20, onChange: setPage, showSizeChanger: false }} size="middle" />

      {/* Modal tạo đơn nhập */}
      <Modal title="Tạo đơn nhập hàng" open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)}
        okText="Tạo" cancelText="Hủy" width={800}>
        <Form form={form} layout="vertical">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="supplier_id" label="Nhà cung cấp" rules={[{ required: true, message: 'Chọn NCC' }]}>
              <Select placeholder="Chọn NCC" options={suppliers.map((s) => ({ value: s.id, label: s.name }))} showSearch
                filterOption={(input, option) => (option?.label as string)?.toLowerCase().includes(input.toLowerCase())} />
            </Form.Item>
            <Form.Item name="paid" label="Đã thanh toán (VNĐ)"><InputNumber min={0} style={{ width: '100%' }}
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} /></Form.Item>
          </div>
          <Form.Item name="note" label="Ghi chú"><Input.TextArea rows={1} /></Form.Item>
          <Typography.Text strong>Danh sách sản phẩm nhập:</Typography.Text>
          <Form.List name="items" rules={[{ validator: async (_, items) => { if (!items || items.length < 1) throw new Error('Thêm ít nhất 1 SP'); } }]}>
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8, alignItems: 'flex-start' }} align="baseline">
                    <Form.Item {...rest} name={[name, 'product_id']} rules={[{ required: true, message: 'Chọn SP' }]}>
                      <Select placeholder="Sản phẩm" style={{ width: 200 }} showSearch
                        options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }))}
                        filterOption={(input, option) => (option?.label as string)?.toLowerCase().includes(input.toLowerCase())} />
                    </Form.Item>
                    <Form.Item {...rest} name={[name, 'quantity']} rules={[{ required: true, message: 'SL' }]}>
                      <InputNumber placeholder="SL" min={1} style={{ width: 80 }} />
                    </Form.Item>
                    <Form.Item {...rest} name={[name, 'unit']}><Input placeholder="ĐVT" style={{ width: 80 }} /></Form.Item>
                    <Form.Item {...rest} name={[name, 'cost_price']} rules={[{ required: true, message: 'Giá' }]}>
                      <InputNumber placeholder="Giá nhập" min={0} style={{ width: 120 }}
                        formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
                    </Form.Item>
                    <Form.Item {...rest} name={[name, 'expiry_date']}><DatePicker placeholder="HSD" /></Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} style={{ color: 'red', marginTop: 8 }} />
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>Thêm sản phẩm</Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      {/* Modal chi tiết */}
      <Modal title={`Đơn nhập #${detailModal?.id}`} open={!!detailModal} onCancel={() => setDetailModal(null)} footer={null} width={700}>
        {detailModal && (
          <>
            <Typography.Text>NCC: <strong>{detailModal.supplier?.name}</strong> | Tổng: <strong>{formatVND(detailModal.total)}</strong></Typography.Text>
            <Table dataSource={detailModal.items} rowKey="id" pagination={false} size="small" style={{ marginTop: 16 }}
              columns={[
                { title: 'Sản phẩm', dataIndex: ['product', 'name'] },
                { title: 'SL', dataIndex: 'quantity', width: 60 },
                { title: 'ĐVT', dataIndex: 'unit', width: 80 },
                { title: 'Giá nhập', dataIndex: 'cost_price', render: formatVND, width: 120 },
                { title: 'Thành tiền', render: (_: any, r: any) => formatVND(r.cost_price * r.quantity), width: 130 },
              ]}
            />
          </>
        )}
      </Modal>
    </div>
  );
}
