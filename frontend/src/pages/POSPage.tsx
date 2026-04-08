import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Row, Col, Card, Input, List, Button, InputNumber, Select, Typography, Tag, message, Modal, Space, Badge, Layout, Spin, Empty, Divider } from 'antd';
import type { InputRef } from 'antd';
import { PlusOutlined, MinusOutlined, DeleteOutlined, ShoppingCartOutlined, SearchOutlined, ArrowLeftOutlined, ClockCircleOutlined, CloseOutlined, CreditCardOutlined, UserOutlined, GiftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { ProductWithStock, Customer, Shift } from '../types';
import { formatVND } from '../utils/format';
import { CASH_DENOMINATIONS } from '../constants';

interface CartItem {
  product: ProductWithStock;
  quantity: number;
  unit: string;
}

interface ActiveOrder {
  id: number;
  items: CartItem[];
  createdAt: string;
  discountAmount: number;
  cashGiven: number;
  selectedCustomer: number | null;
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

export default function POSPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const MAX_STAFF_DISCOUNT_PCT = 20;
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [productsLoading, setProductsLoading] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [discountMode, setDiscountMode] = useState<'amount' | 'percent'>('amount');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const searchRef = useRef<InputRef>(null);
  const modalSearchRef = useRef<InputRef>(null);

  // Multi-order state — payment info stored per-order
  const initialOrderId = useRef(Date.now()).current;
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([
    { id: initialOrderId, items: [], createdAt: new Date().toISOString(), discountAmount: 0, cashGiven: 0, selectedCustomer: null },
  ]);
  const [activeOrderId, setActiveOrderId] = useState<number>(initialOrderId);

  const activeOrder = activeOrders.find((o) => o.id === activeOrderId) || activeOrders[0];
  const activeOrderIndex = activeOrders.findIndex((o) => o.id === activeOrderId) + 1;

  // Payment values derived from active order
  const discountAmount = activeOrder.discountAmount;
  const cashGiven = activeOrder.cashGiven;
  const selectedCustomer = activeOrder.selectedCustomer;

  const updateActiveOrder = useCallback((updates: Partial<ActiveOrder>) => {
    setActiveOrders((prev) =>
      prev.map((o) => (o.id === activeOrderId ? { ...o, ...updates } : o))
    );
  }, [activeOrderId]);

  const setDiscountAmount = (v: number) => updateActiveOrder({ discountAmount: v });
  const setCashGiven = (v: number) => updateActiveOrder({ cashGiven: v });
  const setSelectedCustomer = (v: number | null) => updateActiveOrder({ selectedCustomer: v });

  const fetchProducts = useCallback(async (q?: string) => {
    setProductsLoading(true);
    try {
      const params: any = { limit: 50 };
      if (q) params.search = q;
      const res = await api.get('/products', { params });
      setProducts(res.data || []);
    } catch {
      message.error('Lỗi tải danh sách sản phẩm');
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    api.get('/customers', { params: { limit: 100 } })
      .then((r) => setCustomers(r.data || []))
      .catch(() => message.error('Lỗi tải danh sách khách hàng'));
    api.get('/shifts/current')
      .then((r) => setCurrentShift(r.data))
      .catch(() => setCurrentShift(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce search trong modal
  useEffect(() => {
    if (productModalOpen) {
      const timer = setTimeout(() => fetchProducts(modalSearch), 300);
      return () => clearTimeout(timer);
    }
  }, [modalSearch, productModalOpen, fetchProducts]);

  // Reset discount mode + focus ô search khi đổi tab
  useEffect(() => {
    setDiscountMode('amount');
    setDiscountPercent(0);
    searchRef.current?.focus();
  }, [activeOrderId]);


  const updateActiveOrderItems = useCallback((items: CartItem[]) => {
    updateActiveOrder({ items });
  }, [updateActiveOrder]);

  const addToCart = (product: ProductWithStock) => {
    if (product.stock <= 0) {
      message.warning('Sản phẩm đã hết hàng');
      return;
    }
    const items = activeOrder.items;
    const existing = items.find((c) => c.product.id === product.id);
    let nextItems: CartItem[];
    if (existing) {
      if (existing.quantity >= product.stock) {
        message.warning('Số lượng trong giỏ đã đạt tồn kho');
        return;
      }
      nextItems = items.map((c) =>
        c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c
      );
    } else {
      nextItems = [...items, { product, quantity: 1, unit: product.unit }];
    }
    updateActiveOrderItems(nextItems);
    message.success({ content: `Đã thêm ${product.name}`, duration: 1 });
  };

  // Xử lý ô search chính (trên giỏ hàng)
  // Quét barcode → tìm chính xác → thêm luôn
  // Gõ tên → mở modal
  const handleMainSearch = async () => {
    if (!search.trim()) {
      setProductModalOpen(true);
      setModalSearch('');
      return;
    }
    // Thử tìm sản phẩm khớp barcode/SKU chính xác
    try {
      const res = await api.get('/products', { params: { search: search.trim(), limit: 5 } });
      const results = res.data || [];
      // Nếu có đúng 1 kết quả → thêm luôn vào giỏ
      if (results.length === 1) {
        addToCart(results[0]);
        setSearch('');
        searchRef.current?.focus();
        return;
      }
      // Nhiều kết quả hoặc không có → mở modal để chọn
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
      addToCart(products[0]);
      setProductModalOpen(false);
      setModalSearch('');
    }
  };

  const updateQty = (productId: number, qty: number) => {
    const items = activeOrder.items;
    if (qty <= 0) {
      updateActiveOrderItems(items.filter((c) => c.product.id !== productId));
    } else {
      const item = items.find((c) => c.product.id === productId);
      if (item && qty > item.product.stock) {
        message.warning('Số lượng vượt quá tồn kho');
        return;
      }
      updateActiveOrderItems(
        items.map((c) => (c.product.id === productId ? { ...c, quantity: qty } : c))
      );
    }
  };

  const removeFromCart = (productId: number) => {
    updateActiveOrderItems(activeOrder.items.filter((c) => c.product.id !== productId));
  };

  const subtotal = activeOrder.items.reduce((sum, c) => sum + c.product.sell_price * c.quantity, 0);
  const clampedDiscount = Math.min(discountAmount, subtotal);
  const finalTotal = subtotal - clampedDiscount;
  // Mặc định khách trả đủ tiền — chỉ tính tiền thừa khi chọn mệnh giá lớn hơn
  const effectiveCashGiven = cashGiven === 0 ? finalTotal : cashGiven;
  const changeAmount = effectiveCashGiven > finalTotal ? effectiveCashGiven - finalTotal : 0;

  // --- Multi-order tabs ---
  const MAX_ORDERS = 10;
  const createNewOrder = () => {
    if (activeOrders.length >= MAX_ORDERS) {
      message.warning(`Tối đa ${MAX_ORDERS} đơn hàng`);
      return;
    }
    const newId = Date.now();
    setActiveOrders((prev) => [...prev, { id: newId, items: [], createdAt: new Date().toISOString(), discountAmount: 0, cashGiven: 0, selectedCustomer: null }]);
    setActiveOrderId(newId);
  };

  const switchOrder = (id: number) => {
    setActiveOrderId(id);
  };

  const closeOrderTab = (id: number) => {
    const order = activeOrders.find((o) => o.id === id);
    if (!order) return;
    if (order.items.length > 0) {
      message.warning('Giỏ hàng còn sản phẩm — thanh toán hoặc xóa hết trước khi đóng');
      return;
    }
    const remaining = activeOrders.filter((o) => o.id !== id);
    if (remaining.length === 0) {
      const newId = Date.now();
      setActiveOrders([{ id: newId, items: [], createdAt: new Date().toISOString(), discountAmount: 0, cashGiven: 0, selectedCustomer: null }]);
      setActiveOrderId(newId);
    } else {
      setActiveOrders(remaining);
      if (activeOrderId === id) {
        setActiveOrderId(remaining[remaining.length - 1].id);
      }
    }
  };

  // --- Checkout ---
  const checkoutLoadingRef = useRef(false);
  const handleCheckout = async () => {
    if (checkoutLoadingRef.current) return;
    if (!currentShift) {
      message.warning('Vui lòng mở ca trước khi bán hàng');
      return;
    }
    if (activeOrder.items.length === 0) {
      message.warning('Giỏ hàng trống');
      return;
    }
    if (effectiveCashGiven < finalTotal) {
      message.error('Tiền khách đưa chưa đủ');
      return;
    }

    checkoutLoadingRef.current = true;
    setCheckoutLoading(true);
    try {
      const payload = {
        customer_id: selectedCustomer || undefined,
        discount_amount: discountAmount,
        payment_method: 'cash',
        cash_amount: finalTotal,
        cash_given: effectiveCashGiven,
        items: activeOrder.items.map((c) => ({
          product_id: c.product.id,
          quantity: c.quantity,
          unit: c.unit,
        })),
      };
      await api.post('/invoices', payload);
      message.success('Thanh toán thành công!');

      const remaining = activeOrders.filter((o) => o.id !== activeOrderId);
      if (remaining.length === 0) {
        const newId = Date.now();
        setActiveOrders([{ id: newId, items: [], createdAt: new Date().toISOString(), discountAmount: 0, cashGiven: 0, selectedCustomer: null }]);
        setActiveOrderId(newId);
      } else {
        setActiveOrders(remaining);
        setActiveOrderId(remaining[0].id);
      }

      fetchProducts();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Lỗi thanh toán');
    } finally {
      checkoutLoadingRef.current = false;
      setCheckoutLoading(false);
    }
  };

  // Ref to always access latest handleCheckout (avoids stale closure in keyboard listener)
  const checkoutRef = useRef(handleCheckout);
  useEffect(() => { checkoutRef.current = handleCheckout; });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        checkoutRef.current();
      } else if (e.key === 'Escape') {
        setProductModalOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const denominations = CASH_DENOMINATIONS;

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    height: 48,
    padding: '0 20px',
    borderRadius: 24,
    fontSize: 15,
    fontWeight: isActive ? 600 : 400,
    background: isActive ? THEME.primary : THEME.white,
    color: isActive ? THEME.white : THEME.gray600,
    border: `2px solid ${isActive ? THEME.primary : THEME.gray300}`,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s',
  });

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
            onClick={() => navigate('/')}
            style={{ color: THEME.white, width: 44, height: 44, fontSize: 16 }}
          />
          <Typography.Text strong style={{ color: THEME.white, fontSize: 16 }}>
            Bán hàng
          </Typography.Text>
        </Space>
        <Space size="middle">
          {currentShift ? (
            <Tag icon={<ClockCircleOutlined />} color="success" style={{ fontSize: 13 }}>
              Ca #{currentShift.id}
            </Tag>
          ) : (
            <Tag color="error" style={{ fontSize: 13 }}>Chưa mở ca</Tag>
          )}
          <Typography.Text style={{ color: THEME.white, fontSize: 13 }}>
            {user?.name}
          </Typography.Text>
        </Space>
      </Layout.Header>

      {/* Order Tabs */}
      <div style={{
        background: THEME.white,
        padding: '6px 16px',
        borderBottom: `1px solid ${THEME.gray200}`,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        overflowX: 'auto',
      }}>
        {activeOrders.map((order, index) => {
          const isActive = order.id === activeOrderId;
          return (
            <div key={order.id} style={tabStyle(isActive)} onClick={() => switchOrder(order.id)}>
              <span>Đơn #{index + 1}</span>
              {order.items.length > 0 && (
                <Badge
                  count={order.items.length}
                  style={{ backgroundColor: isActive ? THEME.white : THEME.primary, color: isActive ? THEME.primary : THEME.white }}
                />
              )}
              {activeOrders.length > 1 && (
                <span
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 32, height: 32, borderRadius: 16,
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = isActive ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  onClick={(e) => { e.stopPropagation(); closeOrderTab(order.id); }}
                >
                  <CloseOutlined style={{ fontSize: 13 }} />
                </span>
              )}
            </div>
          );
        })}
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={createNewOrder}
          style={{ height: 48, borderRadius: 24, fontSize: 15, padding: '0 20px' }}
        >
          Thêm đơn
        </Button>
      </div>

      {/* Main Content: 2 cột — flex fill phần còn lại, không scroll */}
      <Layout.Content style={{ padding: 12, flex: 1, overflow: 'hidden' }}>
        <Row gutter={12} style={{ height: '100%' }}>

          {/* CỘT TRÁI: Giỏ hàng — 60% */}
          <Col xs={24} md={15} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Ô tìm kiếm / quét barcode */}
            <Input
              ref={searchRef}
              prefix={<SearchOutlined style={{ color: THEME.gray400, fontSize: 18 }} />}
              placeholder="Quét barcode hoặc gõ tên sản phẩm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onPressEnter={handleMainSearch}
              allowClear
              size="large"
              autoFocus
              style={{ marginBottom: 12, borderRadius: 12, height: 52, fontSize: 16 }}
              suffix={
                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  onClick={() => { setModalSearch(''); setProductModalOpen(true); }}
                  style={{ borderRadius: 8, height: 38 }}
                >
                  Tìm
                </Button>
              }
            />

            {/* Danh sách SP trong giỏ */}
            <Card
              title={
                <Space>
                  <ShoppingCartOutlined style={{ color: THEME.primary }} />
                  <span>Đơn #{activeOrderIndex}</span>
                  <Badge count={activeOrder.items.length} style={{ backgroundColor: THEME.primary }} />
                </Space>
              }
              style={{ flex: 1, borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
              bodyStyle={{ flex: 1, overflow: 'auto', padding: 0 }}
            >
              {activeOrder.items.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Quét barcode hoặc bấm Tìm để thêm sản phẩm"
                  style={{ marginTop: 60 }}
                />
              ) : (
                <List
                  dataSource={activeOrder.items}
                  renderItem={(item, idx) => (
                    <div
                      style={{
                        padding: '14px 16px',
                        borderBottom: `1px solid ${THEME.gray100}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      {/* STT */}
                      <Typography.Text type="secondary" style={{ width: 24, textAlign: 'center', fontSize: 14 }}>
                        {idx + 1}
                      </Typography.Text>

                      {/* Tên + giá đơn vị */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Typography.Text strong style={{ fontSize: 15 }} ellipsis>
                          {item.product.name}
                        </Typography.Text>
                        <Typography.Text type="secondary" style={{ fontSize: 13, display: 'block' }}>
                          {formatVND(item.product.sell_price)} / {item.product.unit}
                        </Typography.Text>
                      </div>

                      {/* Tăng giảm số lượng */}
                      <Space size={6}>
                        <Button
                          icon={<MinusOutlined />}
                          onClick={() => updateQty(item.product.id, item.quantity - 1)}
                          style={{ width: 44, height: 44, borderRadius: 10, fontSize: 16 }}
                        />
                        <InputNumber
                          min={1}
                          value={item.quantity}
                          onChange={(v) => updateQty(item.product.id, v || 1)}
                          style={{ width: 56, height: 44 }}
                          controls={false}
                        />
                        <Button
                          icon={<PlusOutlined />}
                          onClick={() => updateQty(item.product.id, item.quantity + 1)}
                          style={{ width: 44, height: 44, borderRadius: 10, fontSize: 16 }}
                        />
                      </Space>

                      {/* Thành tiền */}
                      <Typography.Text strong style={{ fontSize: 15, color: THEME.primary, minWidth: 100, textAlign: 'right' }}>
                        {formatVND(item.product.sell_price * item.quantity)}
                      </Typography.Text>

                      {/* Xóa */}
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => removeFromCart(item.product.id)}
                        style={{ width: 44, height: 44, fontSize: 16 }}
                      />
                    </div>
                  )}
                />
              )}
            </Card>
          </Col>

          {/* CỘT PHẢI: Thanh toán — 40% */}
          <Col xs={24} md={9} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Card
              style={{ flex: 1, borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
              bodyStyle={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', overflow: 'auto' }}
            >
              {/* Tạm tính */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Typography.Text style={{ fontSize: 15 }}>Tạm tính</Typography.Text>
                <Typography.Text strong style={{ fontSize: 20 }}>{formatVND(subtotal)}</Typography.Text>
              </div>

              {/* Giảm giá — bấm đ/% để chuyển đổi */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <GiftOutlined style={{ color: THEME.warning }} />
                    <Typography.Text style={{ fontSize: 14 }}>Giảm giá</Typography.Text>
                  </div>
                </div>
                <Space.Compact style={{ width: '100%' }}>
                  <InputNumber
                    min={0}
                    max={discountMode === 'percent' ? (user?.role === 'admin' ? 100 : MAX_STAFF_DISCOUNT_PCT) : (user?.role === 'admin' ? subtotal : Math.round(subtotal * MAX_STAFF_DISCOUNT_PCT / 100))}
                    value={discountMode === 'percent' ? discountPercent : discountAmount}
                    onChange={(v) => {
                      const maxPct = user?.role === 'admin' ? 100 : MAX_STAFF_DISCOUNT_PCT;
                      if (discountMode === 'percent') {
                        const pct = Math.min(v || 0, maxPct);
                        setDiscountPercent(pct);
                        setDiscountAmount(Math.round(subtotal * pct / 100));
                        if ((v || 0) > maxPct) message.warning(`Chỉ được giảm tối đa ${maxPct}%`);
                      } else {
                        const maxAmount = Math.round(subtotal * maxPct / 100);
                        const amount = Math.min(v || 0, user?.role === 'admin' ? subtotal : maxAmount);
                        setDiscountAmount(amount);
                        setDiscountPercent(subtotal > 0 ? Math.round(amount / subtotal * 100) : 0);
                        if ((v || 0) > maxAmount && user?.role !== 'admin') message.warning(`Chỉ được giảm tối đa ${maxPct}% (${formatVND(maxAmount)})`);
                      }
                    }}
                    formatter={(v) => discountMode === 'percent' ? `${v}%` : `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + 'đ'}
                    parser={(v) => Number((v as string).replace(/[^\d]/g, ''))}
                    style={{ flex: 1 }}
                  />
                  <Button
                    onClick={() => setDiscountMode(discountMode === 'amount' ? 'percent' : 'amount')}
                    style={{ width: 44, fontWeight: 600 }}
                  >
                    ⇄
                  </Button>
                </Space.Compact>
              </div>

              {/* Khách hàng */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <UserOutlined style={{ color: THEME.primary }} />
                  <Typography.Text style={{ fontSize: 14 }}>Khách hàng</Typography.Text>
                </div>
                <Select
                  showSearch
                  allowClear
                  placeholder="Khách lẻ"
                  value={selectedCustomer}
                  onChange={setSelectedCustomer}
                  options={customers.map((c) => ({
                    value: c.id,
                    label: `${c.name}${c.phone ? ` - ${c.phone}` : ''}`,
                  }))}
                  style={{ width: '100%' }}
                  filterOption={(input, option) =>
                    (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                />
              </div>

              <Divider style={{ margin: '6px 0 10px' }} />

              {/* Tiền khách đưa */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <CreditCardOutlined style={{ color: THEME.success }} />
                  <Typography.Text style={{ fontSize: 14 }}>Tiền khách đưa</Typography.Text>
                </div>
                <InputNumber
                  min={0}
                  value={cashGiven}
                  onChange={(v) => setCashGiven(v || 0)}
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => Number((v as string).replace(/\D/g, ''))}
                  placeholder={subtotal > 0 ? `Mặc định: ${formatVND(finalTotal)}` : 'Đủ tiền'}
                  addonAfter="đ"
                  style={{ width: '100%' }}
                  size="large"
                />
              </div>

              {/* Mệnh giá nhanh — chỉ hiện khi khách đưa khác giá */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
                {denominations.map((d) => (
                  <Button
                    key={d}
                    onClick={() => setCashGiven(cashGiven === d ? 0 : d)}
                    style={{
                      height: 44,
                      borderRadius: 10,
                      fontSize: 15,
                      fontWeight: cashGiven === d ? 700 : 500,
                      borderColor: cashGiven === d ? THEME.primary : undefined,
                      borderWidth: cashGiven === d ? 2 : 1,
                      color: cashGiven === d ? THEME.primary : undefined,
                      background: cashGiven === d ? '#f0fdfa' : undefined,
                    }}
                  >
                    {d / 1000}k
                  </Button>
                ))}
              </div>

              {/* Tiền thừa */}
              {changeAmount > 0 && (
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 10,
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 10,
                }}>
                  <Typography.Text style={{ color: '#166534', fontSize: 14 }}>Tiền thừa:</Typography.Text>
                  <Typography.Text strong style={{ color: '#15803d', fontSize: 22 }}>
                    {formatVND(changeAmount)}
                  </Typography.Text>
                </div>
              )}

              {/* Spacer */}
              <div style={{ flex: 1 }} />

              {/* Tổng + nút thanh toán */}
              <div style={{
                background: THEME.primary,
                borderRadius: 12,
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}>
                <Typography.Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>
                  THÀNH TIỀN
                </Typography.Text>
                <Typography.Title level={3} style={{ color: THEME.white, margin: 0 }}>
                  {formatVND(finalTotal)}
                </Typography.Title>
              </div>

              <Button
                type="primary"
                size="large"
                block
                icon={<CreditCardOutlined />}
                onClick={handleCheckout}
                disabled={activeOrder.items.length === 0 || effectiveCashGiven < finalTotal}
                loading={checkoutLoading}
                style={{
                  height: 56,
                  fontSize: 18,
                  fontWeight: 700,
                  borderRadius: 14,
                  background: activeOrder.items.length > 0 && effectiveCashGiven >= finalTotal
                    ? THEME.primary : undefined,
                  border: 'none',
                }}
              >
                THANH TOÁN (F1)
              </Button>
            </Card>
          </Col>
        </Row>
      </Layout.Content>

      {/* Modal chọn sản phẩm */}
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
          onChange={(e) => setModalSearch(e.target.value)}
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
            {products.map((p) => (
              <Col xs={12} sm={8} md={6} key={p.id}>
                <Card
                  hoverable={p.stock > 0}
                  onClick={() => {
                    if (p.stock > 0) {
                      addToCart(p);
                      setProductModalOpen(false);
                      setModalSearch('');
                      searchRef.current?.focus();
                    }
                  }}
                  bodyStyle={{ padding: 12 }}
                  style={{
                    borderRadius: 10,
                    cursor: p.stock > 0 ? 'pointer' : 'not-allowed',
                    opacity: p.stock <= 0 ? 0.4 : 1,
                  }}
                >
                  <Typography.Text strong style={{ fontSize: 13, display: 'block' }} ellipsis>
                    {p.name}
                  </Typography.Text>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, alignItems: 'center' }}>
                    <Typography.Text style={{ fontSize: 14, fontWeight: 600, color: THEME.primary }}>
                      {formatVND(p.sell_price)}
                    </Typography.Text>
                    <Tag color={p.stock > 10 ? 'success' : p.stock > 0 ? 'warning' : 'error'} style={{ fontSize: 12 }}>
                      {p.stock}
                    </Tag>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Modal>
    </Layout>
  );
}
