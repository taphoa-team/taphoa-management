import {
  PlusOutlined,
  MinusOutlined,
  DeleteOutlined,
  SearchOutlined,
  ArrowLeftOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';
import {
  Row,
  Col,
  Card,
  Input,
  Button,
  InputNumber,
  Select,
  Typography,
  message,
  Modal,
  Space,
  Badge,
  Layout,
  Spin,
  Empty,
  Divider,
  DatePicker,
  Form,
} from 'antd';
import type { InputRef } from 'antd';
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { useProducts, useSuppliers, useCreatePurchaseOrder, useCreateSupplier } from '../hooks';
import type { ProductWithStock } from '../types';
import { formatVND, inputNumberFormatter, getErrorMessage } from '../utils/format';

interface OrderItem {
  product: ProductWithStock;
  quantity: number;
  unit: string;
  cost_price: number;
  expiry_date?: string;
}

const THEME = {
  primary: '#0d9488',
  primaryLight: '#14b8a6',
  primaryDark: '#0f766e',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  white: '#ffffff',
};

export default function CreatePurchaseOrderPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState<OrderItem[]>([]);
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [paid, setPaid] = useState(0);
  const [note, setNote] = useState('');

  // Search
  const [search, setSearch] = useState('');
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const searchRef = useRef<InputRef>(null);
  const modalSearchRef = useRef<InputRef>(null);

  // Supplier modal
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [supplierForm] = Form.useForm();

  // Product search params
  const [productParams, setProductParams] = useState<Record<string, unknown>>({ limit: 50 });
  const { data: products = [], isLoading: productsLoading } = useProducts(productParams);
  const { data: suppliers = [] } = useSuppliers();
  const createPOMutation = useCreatePurchaseOrder();
  const createSupplierMutation = useCreateSupplier();

  // Modal search debounce
  useEffect(() => {
    if (productModalOpen) {
      const timer = setTimeout(() => {
        const params: Record<string, unknown> = { limit: 50 };
        if (modalSearch) params.search = modalSearch;
        setProductParams(params);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [modalSearch, productModalOpen]);

  const addItem = (product: ProductWithStock) => {
    const existing = items.find(i => i.product.id === product.id);
    if (existing) {
      setItems(
        items.map(i => (i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i))
      );
    } else {
      setItems([
        ...items,
        {
          product,
          quantity: 1,
          unit: product.unit,
          cost_price: 0,
          expiry_date: undefined,
        },
      ]);
    }
    message.success({ content: `Đã thêm ${product.name}`, duration: 1 });
  };

  // Main search: barcode → exact match → add
  const handleMainSearch = async () => {
    if (!search.trim()) {
      setProductModalOpen(true);
      setModalSearch('');
      return;
    }
    try {
      const api = (await import('../services/api')).default;
      const res = await api.get('/products', { params: { search: search.trim(), limit: 5 } });
      const results = res.data || [];
      if (results.length === 1) {
        addItem(results[0]);
        setSearch('');
        searchRef.current?.focus();
        return;
      }
      setModalSearch(search);
      setProductModalOpen(true);
      setSearch('');
    } catch {
      setModalSearch(search);
      setProductModalOpen(true);
      setSearch('');
    }
  };

  const handleModalSearchEnter = () => {
    if (products.length === 1) {
      addItem(products[0]);
      setProductModalOpen(false);
      setModalSearch('');
    }
  };

  const updateItem = (productId: number, updates: Partial<OrderItem>) => {
    setItems(items.map(i => (i.product.id === productId ? { ...i, ...updates } : i)));
  };

  const updateQty = (productId: number, qty: number) => {
    if (qty <= 0) {
      setItems(items.filter(i => i.product.id !== productId));
    } else {
      updateItem(productId, { quantity: qty });
    }
  };

  const removeItem = (productId: number) => {
    setItems(items.filter(i => i.product.id !== productId));
  };

  const total = items.reduce((sum, i) => sum + i.cost_price * i.quantity, 0);
  const debtAmount = total - paid;

  const handleCreateSupplier = async () => {
    if (createSupplierMutation.isPending) return;
    const values = await supplierForm.validateFields();
    try {
      const res = await createSupplierMutation.mutateAsync(values);
      message.success('Đã tạo NCC');
      setSupplierModalOpen(false);
      setSupplierId(res.data.id);
    } catch (err: unknown) {
      message.error(getErrorMessage(err, 'Lỗi tạo NCC'));
    }
  };

  const handleSubmit = async () => {
    if (!supplierId) {
      message.warning('Chọn nhà cung cấp');
      return;
    }
    if (items.length === 0) {
      message.warning('Thêm ít nhất 1 sản phẩm');
      return;
    }
    const missingPrice = items.find(i => !i.cost_price || i.cost_price <= 0);
    if (missingPrice) {
      message.warning(`Nhập giá nhập cho "${missingPrice.product.name}"`);
      return;
    }

    try {
      await createPOMutation.mutateAsync({
        supplier_id: supplierId,
        paid: paid || 0,
        note: note || undefined,
        items: items.map(i => ({
          product_id: i.product.id,
          quantity: i.quantity,
          unit: i.unit,
          cost_price: i.cost_price,
          expiry_date: i.expiry_date || undefined,
        })),
      });
      message.success('Đã tạo đơn nhập hàng!');
      navigate('/purchase-orders');
    } catch (err: unknown) {
      message.error(getErrorMessage(err));
    }
  };

  // Keyboard: Escape to close modal
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setProductModalOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden', background: THEME.gray100 }}>
      {/* Header */}
      <Layout.Header
        style={{
          background: `linear-gradient(135deg, ${THEME.primaryDark} 0%, ${THEME.primary} 50%, ${THEME.primaryLight} 100%)`,
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 56,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        <Space size="middle">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/purchase-orders')}
            style={{ color: THEME.white, width: 44, height: 44, fontSize: 16 }}
          />
          <Typography.Text strong style={{ color: THEME.white, fontSize: 16 }}>
            Tạo đơn nhập hàng
          </Typography.Text>
        </Space>
        <Badge count={items.length} style={{ backgroundColor: THEME.success }}>
          <Typography.Text style={{ color: THEME.white, fontSize: 14 }}>
            {items.length} sản phẩm
          </Typography.Text>
        </Badge>
      </Layout.Header>

      {/* Main Content */}
      <Layout.Content style={{ padding: 12, flex: 1, overflow: 'hidden' }}>
        <Row gutter={12} style={{ height: '100%' }}>
          {/* LEFT: Items — 60% */}
          <Col xs={24} md={15} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Search / barcode input */}
            <Input
              ref={searchRef}
              prefix={<SearchOutlined style={{ color: THEME.gray400, fontSize: 18 }} />}
              placeholder="Quét barcode hoặc gõ tên sản phẩm..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onPressEnter={handleMainSearch}
              allowClear
              size="large"
              autoFocus
              style={{ marginBottom: 12, borderRadius: 12, height: 52, fontSize: 16 }}
              suffix={
                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  onClick={() => {
                    setModalSearch('');
                    setProductModalOpen(true);
                  }}
                  style={{ borderRadius: 8, height: 38 }}
                >
                  Tìm
                </Button>
              }
            />

            {/* Item list */}
            <Card
              title={
                <Space>
                  <MinusCircleOutlined style={{ color: THEME.primary }} />
                  <span>Danh sách nhập</span>
                  <Badge count={items.length} style={{ backgroundColor: THEME.primary }} />
                </Space>
              }
              style={{
                flex: 1,
                borderRadius: 12,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
              styles={{ body: { flex: 1, overflow: 'auto', padding: 0 } }}
            >
              {items.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Quét barcode hoặc bấm Tìm để thêm sản phẩm"
                  style={{ marginTop: 60 }}
                />
              ) : (
                items.map((item, idx) => (
                  <div
                    key={item.product.id}
                    style={{
                      padding: '12px 16px',
                      borderBottom: `1px solid ${THEME.gray100}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    {/* STT */}
                    <Typography.Text
                      type="secondary"
                      style={{ width: 24, textAlign: 'center', fontSize: 14 }}
                    >
                      {idx + 1}
                    </Typography.Text>

                    {/* Name + SKU */}
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <Typography.Text strong style={{ fontSize: 14, display: 'block' }} ellipsis>
                        {item.product.name}
                      </Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {item.product.sku} · {item.product.unit}
                      </Typography.Text>
                    </div>

                    {/* Quantity */}
                    <Space size={4}>
                      <Button
                        icon={<MinusOutlined />}
                        size="small"
                        onClick={() => updateQty(item.product.id, item.quantity - 1)}
                        style={{ width: 32, height: 32 }}
                      />
                      <InputNumber
                        min={1}
                        value={item.quantity}
                        onChange={v => updateQty(item.product.id, v || 1)}
                        style={{ width: 56, height: 32 }}
                        controls={false}
                        size="small"
                      />
                      <Button
                        icon={<PlusOutlined />}
                        size="small"
                        onClick={() => updateQty(item.product.id, item.quantity + 1)}
                        style={{ width: 32, height: 32 }}
                      />
                    </Space>

                    {/* Cost price */}
                    <InputNumber
                      min={0}
                      value={item.cost_price}
                      onChange={v => updateItem(item.product.id, { cost_price: v || 0 })}
                      formatter={inputNumberFormatter}
                      parser={v => Number((v as string).replace(/\D/g, ''))}
                      placeholder="Giá nhập"
                      addonAfter="đ"
                      style={{ width: 150 }}
                      size="small"
                    />

                    {/* Expiry date */}
                    {item.product.has_expiry && (
                      <DatePicker
                        placeholder="HSD"
                        size="small"
                        style={{ width: 120 }}
                        onChange={(_, dateStr) =>
                          updateItem(item.product.id, { expiry_date: dateStr as string })
                        }
                      />
                    )}

                    {/* Line total */}
                    <Typography.Text
                      strong
                      style={{
                        fontSize: 14,
                        color: THEME.primary,
                        minWidth: 90,
                        textAlign: 'right',
                      }}
                    >
                      {formatVND(item.cost_price * item.quantity)}
                    </Typography.Text>

                    {/* Delete */}
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeItem(item.product.id)}
                      style={{ width: 32, height: 32 }}
                    />
                  </div>
                ))
              )}
            </Card>
          </Col>

          {/* RIGHT: Order info — 40% */}
          <Col xs={24} md={9} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Card
              style={{
                flex: 1,
                borderRadius: 12,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
              styles={{
                body: {
                  flex: 1,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'auto',
                },
              }}
            >
              {/* Supplier */}
              <div style={{ marginBottom: 12 }}>
                <Typography.Text style={{ fontSize: 14, marginBottom: 6, display: 'block' }}>
                  Nhà cung cấp <span style={{ color: THEME.error }}>*</span>
                </Typography.Text>
                <Select
                  placeholder="Chọn NCC"
                  value={supplierId}
                  onChange={setSupplierId}
                  options={suppliers.map(s => ({ value: s.id, label: s.name }))}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                  style={{ width: '100%' }}
                  size="large"
                  dropdownRender={menu => (
                    <>
                      {menu}
                      <Divider style={{ margin: '8px 0' }} />
                      <Button
                        type="link"
                        icon={<PlusOutlined />}
                        onClick={() => {
                          supplierForm.resetFields();
                          setSupplierModalOpen(true);
                        }}
                        style={{ width: '100%', justifyContent: 'flex-start' }}
                      >
                        Tạo NCC mới
                      </Button>
                    </>
                  )}
                />
              </div>

              {/* Note */}
              <div style={{ marginBottom: 12 }}>
                <Typography.Text style={{ fontSize: 14, marginBottom: 6, display: 'block' }}>
                  Ghi chú
                </Typography.Text>
                <Input.TextArea
                  rows={2}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Ghi chú đơn nhập..."
                />
              </div>

              <Divider style={{ margin: '6px 0 12px' }} />

              {/* Summary */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Typography.Text style={{ fontSize: 14 }}>Số lượng SP:</Typography.Text>
                <Typography.Text strong>
                  {items.reduce((sum, i) => sum + i.quantity, 0)}
                </Typography.Text>
              </div>

              <div
                style={{
                  background: THEME.primary,
                  borderRadius: 12,
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <Typography.Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>
                  TỔNG TIỀN
                </Typography.Text>
                <Typography.Title level={3} style={{ color: THEME.white, margin: 0 }}>
                  {formatVND(total)}
                </Typography.Title>
              </div>

              {/* Paid */}
              <div style={{ marginBottom: 10 }}>
                <Typography.Text style={{ fontSize: 14, marginBottom: 6, display: 'block' }}>
                  Đã thanh toán
                </Typography.Text>
                <InputNumber
                  min={0}
                  max={total}
                  value={paid}
                  onChange={v => setPaid(v || 0)}
                  formatter={inputNumberFormatter}
                  parser={v => Number((v as string).replace(/\D/g, ''))}
                  addonAfter="đ"
                  style={{ width: '100%' }}
                  size="large"
                />
              </div>

              {/* Debt */}
              {debtAmount > 0 && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 10,
                    padding: '10px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 10,
                  }}
                >
                  <Typography.Text style={{ color: '#991b1b', fontSize: 14 }}>
                    Còn nợ:
                  </Typography.Text>
                  <Typography.Text strong style={{ color: '#dc2626', fontSize: 20 }}>
                    {formatVND(debtAmount)}
                  </Typography.Text>
                </div>
              )}

              {/* Spacer */}
              <div style={{ flex: 1 }} />

              {/* Submit button */}
              <Button
                type="primary"
                size="large"
                block
                onClick={handleSubmit}
                disabled={!supplierId || items.length === 0}
                loading={createPOMutation.isPending}
                style={{
                  height: 56,
                  fontSize: 18,
                  fontWeight: 700,
                  borderRadius: 14,
                  background: supplierId && items.length > 0 ? THEME.primary : undefined,
                  border: 'none',
                }}
              >
                TẠO ĐƠN NHẬP
              </Button>
            </Card>
          </Col>
        </Row>
      </Layout.Content>

      {/* Product selection modal */}
      <Modal
        title={
          <Space>
            <SearchOutlined style={{ color: THEME.primary }} />
            <span>Chọn sản phẩm</span>
          </Space>
        }
        open={productModalOpen}
        onCancel={() => setProductModalOpen(false)}
        footer={null}
        width={800}
        styles={{ body: { padding: '20px', maxHeight: '65vh', overflow: 'auto' } }}
      >
        <Input
          ref={modalSearchRef}
          prefix={<SearchOutlined style={{ color: THEME.gray400 }} />}
          placeholder="Tìm tên, SKU, barcode..."
          value={modalSearch}
          onChange={e => setModalSearch(e.target.value)}
          onPressEnter={handleModalSearchEnter}
          allowClear
          size="large"
          style={{ marginBottom: 16, borderRadius: 10 }}
          autoFocus
        />

        {productsLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
          </div>
        ) : products.length === 0 ? (
          <Empty description="Không tìm thấy sản phẩm" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Row gutter={[12, 12]}>
            {products.map(p => {
              const inOrder = items.find(i => i.product.id === p.id);
              return (
                <Col xs={12} sm={8} md={6} key={p.id}>
                  <Card
                    hoverable
                    onClick={() => {
                      addItem(p);
                      searchRef.current?.focus();
                    }}
                    styles={{ body: { padding: 12 } }}
                    style={{
                      borderRadius: 10,
                      cursor: 'pointer',
                      borderColor: inOrder ? THEME.primary : undefined,
                      borderWidth: inOrder ? 2 : 1,
                    }}
                  >
                    <Typography.Text strong style={{ fontSize: 13, display: 'block' }} ellipsis>
                      {p.name}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                      {p.sku}
                    </Typography.Text>
                    {inOrder && (
                      <Badge
                        count={inOrder.quantity}
                        style={{
                          backgroundColor: THEME.primary,
                          position: 'absolute',
                          top: 8,
                          right: 8,
                        }}
                      />
                    )}
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </Modal>

      {/* Supplier modal */}
      <Modal
        title="Tạo nhà cung cấp mới"
        open={supplierModalOpen}
        onOk={handleCreateSupplier}
        onCancel={() => setSupplierModalOpen(false)}
        okText="Tạo"
        cancelText="Hủy"
        confirmLoading={createSupplierMutation.isPending}
      >
        <Form form={supplierForm} layout="vertical">
          <Form.Item
            name="name"
            label="Tên NCC"
            rules={[{ required: true, message: 'Nhập tên NCC' }]}
          >
            <Input placeholder="VD: Đại lý Minh Phát" />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="phone" label="Số điện thoại">
              <Input placeholder="VD: 0901234567" />
            </Form.Item>
            <Form.Item name="address" label="Địa chỉ">
              <Input placeholder="VD: 123 Lê Lợi, Q.1" />
            </Form.Item>
          </div>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
