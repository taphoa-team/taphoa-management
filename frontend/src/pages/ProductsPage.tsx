import React, { useEffect, useState, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, Switch, message, Space, Typography, Tag, Divider, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, StopOutlined, SearchOutlined, PrinterOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../services/api';
import { ProductWithStock, Category, UnitConversion } from '../types';
import { useAuth } from '../contexts/AuthContext';

export default function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProductWithStock | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  const [form] = Form.useForm();

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (search) params.search = search;
      if (categoryFilter) params.category_id = categoryFilter;
      const res = await api.get('/products', { params });
      setProducts(res.data || []);
    } catch {
      message.error('Lỗi tải sản phẩm');
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchCategories(); }, []);
  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ has_expiry: false });
    setModalOpen(true);
  };

  const openEdit = (p: ProductWithStock) => {
    setEditing(p);
    form.setFieldsValue({
      name: p.name,
      category_id: p.category_id,
      sell_price: p.sell_price,
      min_quantity: p.min_quantity,
      has_expiry: p.has_expiry,
      unit: p.unit,
      barcode: p.barcode,
    });
    fetchConversions(p.id);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await api.put(`/products/${editing.id}`, values);
        message.success('Đã cập nhật');
      } else {
        await api.post('/products', values);
        message.success('Đã thêm sản phẩm');
      }
      setModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Lỗi');
    }
  };

  const handleDeactivate = async (id: number) => {
    try {
      await api.patch(`/products/${id}/deactivate`);
      message.success('Đã ngừng bán');
      fetchProducts();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Lỗi');
    }
  };

  // --- Quy đổi đơn vị ---
  const [conversions, setConversions] = useState<UnitConversion[]>([]);
  const [convForm] = Form.useForm();

  const fetchConversions = async (productId: number) => {
    try {
      const res = await api.get(`/products/${productId}/conversions`);
      setConversions(res.data || []);
    } catch { setConversions([]); }
  };

  const addConversion = async () => {
    if (!editing) return;
    try {
      const values = await convForm.validateFields();
      await api.post(`/products/${editing.id}/conversions`, values);
      convForm.resetFields();
      fetchConversions(editing.id);
      message.success('Đã thêm quy đổi');
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Lỗi');
    }
  };

  const deleteConversion = async (productId: number, convId: number) => {
    try {
      await api.delete(`/products/${productId}/conversions/${convId}`);
      fetchConversions(productId);
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Lỗi');
    }
  };

  // --- In barcode ---
  const printBarcode = (product: ProductWithStock) => {
    const w = window.open('', '_blank', 'width=400,height=300');
    if (!w) return;
    w.document.write(`
      <html><head><title>Tem ${product.sku}</title>
      <style>
        body { font-family: monospace; text-align: center; padding: 20px; }
        .sku { font-size: 24px; letter-spacing: 4px; margin: 10px 0; }
        .name { font-size: 14px; }
        .price { font-size: 18px; font-weight: bold; margin-top: 8px; }
        @media print { body { padding: 5px; } }
      </style></head><body>
        <div class="name">${product.name}</div>
        <div class="sku">${product.sku}</div>
        ${product.barcode ? `<div class="sku">${product.barcode}</div>` : ''}
        <div class="price">${product.sell_price.toLocaleString('vi-VN')}đ</div>
        <script>window.print(); window.close();</script>
      </body></html>
    `);
    w.document.close();
  };

  const formatVND = (value: number) => value.toLocaleString('vi-VN') + 'đ';

  const columns = [
    { title: 'SKU', dataIndex: 'sku', width: 100 },
    { title: 'Tên sản phẩm', dataIndex: 'name', ellipsis: true },
    {
      title: 'Nhóm',
      dataIndex: ['category', 'name'],
      width: 120,
    },
    {
      title: 'Giá bán',
      dataIndex: 'sell_price',
      width: 120,
      render: (v: number) => formatVND(v),
      align: 'right' as const,
    },
    { title: 'ĐVT', dataIndex: 'unit', width: 80 },
    {
      title: 'Tồn kho',
      dataIndex: 'stock',
      width: 100,
      align: 'right' as const,
      render: (stock: number, record: ProductWithStock) => {
        const color = stock === 0 ? 'red' : stock <= record.min_quantity ? 'orange' : 'green';
        return <Tag color={color}>{stock}</Tag>;
      },
    },
    {
      title: 'Thao tác',
      width: 240,
      render: (_: any, record: ProductWithStock) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(record)}>Sửa</Button>
          <Button icon={<PrinterOutlined />} size="small" onClick={() => printBarcode(record)}>Tem</Button>
          {user?.role === 'admin' && (
            <Button icon={<StopOutlined />} size="small" danger onClick={() => handleDeactivate(record.id)}>
              Ngừng
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Sản phẩm</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm SP</Button>
      </div>

      <Space style={{ marginBottom: 16 }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Tìm tên, SKU, barcode..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          allowClear
          style={{ width: 280 }}
        />
        <Select
          placeholder="Lọc nhóm hàng"
          value={categoryFilter}
          onChange={(v) => { setCategoryFilter(v); setPage(1); }}
          allowClear
          style={{ width: 180 }}
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
        />
      </Space>

      <Table
        dataSource={products}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize: 20,
          onChange: setPage,
          showSizeChanger: false,
        }}
        size="middle"
      />

      <Modal
        title={editing ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        okText={editing ? 'Cập nhật' : 'Thêm'}
        cancelText="Hủy"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Tên sản phẩm" rules={[{ required: true, message: 'Nhập tên' }]}>
            <Input placeholder="VD: Mì Hảo Hảo" />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="category_id" label="Nhóm hàng" rules={[{ required: true, message: 'Chọn nhóm' }]}>
              <Select
                placeholder="Chọn nhóm"
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
              />
            </Form.Item>
            <Form.Item name="unit" label="Đơn vị tính" rules={[{ required: true, message: 'Nhập ĐVT' }]}>
              <Input placeholder="VD: gói, lon, kg" />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="sell_price" label="Giá bán (VNĐ)" rules={[{ required: true, message: 'Nhập giá' }]}>
              <InputNumber min={1} style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
            </Form.Item>
            <Form.Item name="min_quantity" label="Tồn kho tối thiểu">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="barcode" label="Barcode">
              <Input placeholder="Quét hoặc nhập mã vạch" />
            </Form.Item>
            <Form.Item name="has_expiry" label="Có hạn sử dụng" valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>

          {/* Quy đổi đơn vị — chỉ hiện khi sửa */}
          {editing && (
            <>
              <Divider>Quy đổi đơn vị</Divider>
              {conversions.length > 0 && (
                <Table
                  dataSource={conversions}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  style={{ marginBottom: 12 }}
                  columns={[
                    { title: 'Từ', dataIndex: 'from_unit', width: 100 },
                    { title: '→', width: 30, render: () => '=' },
                    { title: 'Số lượng', dataIndex: 'conversion_rate', width: 80, align: 'right' },
                    { title: 'Đơn vị nhỏ', dataIndex: 'to_unit', width: 100 },
                    {
                      title: '',
                      width: 50,
                      render: (_: any, record: UnitConversion) => (
                        <Popconfirm title="Xóa quy đổi này?" onConfirm={() => deleteConversion(editing.id, record.id)}>
                          <Button size="small" icon={<DeleteOutlined />} danger type="text" />
                        </Popconfirm>
                      ),
                    },
                  ]}
                />
              )}
              <Form form={convForm} layout="inline" style={{ marginBottom: 8 }}>
                <Form.Item name="from_unit" rules={[{ required: true, message: 'Nhập' }]}>
                  <Input placeholder="thùng" style={{ width: 90 }} />
                </Form.Item>
                <span style={{ lineHeight: '32px' }}>=</span>
                <Form.Item name="conversion_rate" rules={[{ required: true, message: 'Nhập' }]}>
                  <InputNumber min={1} placeholder="24" style={{ width: 70 }} />
                </Form.Item>
                <Form.Item name="to_unit" rules={[{ required: true, message: 'Nhập' }]}>
                  <Input placeholder="chai" style={{ width: 90 }} />
                </Form.Item>
                <Button icon={<PlusOutlined />} onClick={addConversion}>Thêm</Button>
              </Form>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
}
