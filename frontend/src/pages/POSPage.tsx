import React, { useEffect, useState, useRef } from 'react';
import { Row, Col, Card, Input, List, Button, InputNumber, Select, Typography, Tag, message, Modal, Form, Space, Divider, Badge, Layout } from 'antd';
import type { InputRef } from 'antd';
import { PlusOutlined, MinusOutlined, DeleteOutlined, ShoppingCartOutlined, SearchOutlined, PauseCircleOutlined, PlayCircleOutlined, ArrowLeftOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { ProductWithStock, Customer, Shift } from '../types';
import { formatVND, APP_NAME } from '../utils/format';

interface CartItem {
  product: ProductWithStock;
  quantity: number;
  unit: string;
}

interface HeldOrder {
  id: number;
  cart: CartItem[];
  note: string;
  heldAt: string;
}

const HELD_ORDERS_KEY = 'taphoa_held_orders';
const HELD_ORDERS_SEQ_KEY = 'taphoa_held_orders_seq';

function loadHeldOrders(): HeldOrder[] {
  try {
    return JSON.parse(localStorage.getItem(HELD_ORDERS_KEY) || '[]');
  } catch { return []; }
}

function saveHeldOrders(orders: HeldOrder[]) {
  localStorage.setItem(HELD_ORDERS_KEY, JSON.stringify(orders));
}

function nextHeldId(): number {
  const seq = parseInt(localStorage.getItem(HELD_ORDERS_SEQ_KEY) || '0', 10) + 1;
  localStorage.setItem(HELD_ORDERS_SEQ_KEY, String(seq));
  return seq;
}

export default function POSPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>(loadHeldOrders);
  const [heldOpen, setHeldOpen] = useState(false);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [form] = Form.useForm();
  const searchRef = useRef<InputRef>(null);

  const fetchProducts = async (q?: string) => {
    try {
      const params: any = { limit: 50 };
      if (q) params.search = q;
      const res = await api.get('/products', { params });
      setProducts(res.data || []);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchProducts();
    api.get('/customers', { params: { limit: 100 } }).then((r) => setCustomers(r.data || [])).catch(() => {});
    api.get('/shifts/current').then((r) => setCurrentShift(r.data)).catch(() => setCurrentShift(null));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchProducts(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const addToCart = (product: ProductWithStock) => {
    if (product.stock <= 0) {
      message.warning('Sản phẩm đã hết hàng');
      return;
    }
    const existing = cart.find((c) => c.product.id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) {
        message.warning('Số lượng trong giỏ đã đạt tồn kho');
        return;
      }
      setCart(cart.map((c) => c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { product, quantity: 1, unit: product.unit }]);
    }
  };

  const updateQty = (productId: number, qty: number) => {
    if (qty <= 0) {
      setCart(cart.filter((c) => c.product.id !== productId));
    } else {
      const item = cart.find((c) => c.product.id === productId);
      if (item && qty > item.product.stock) {
        message.warning('Số lượng vượt quá tồn kho');
        return;
      }
      setCart(cart.map((c) => c.product.id === productId ? { ...c, quantity: qty } : c));
    }
  };

  const removeFromCart = (productId: number) => setCart(cart.filter((c) => c.product.id !== productId));

  const total = cart.reduce((sum, c) => sum + c.product.sell_price * c.quantity, 0);

  // --- Tạm giữ đơn ---
  const holdOrder = () => {
    if (cart.length === 0) { message.warning('Giỏ hàng trống'); return; }
    const order: HeldOrder = {
      id: nextHeldId(),
      cart: [...cart],
      note: `${cart.length} SP — ${formatVND(total)}`,
      heldAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };
    const updated = [...heldOrders, order];
    setHeldOrders(updated);
    saveHeldOrders(updated);
    setCart([]);
    message.success('Đã tạm giữ đơn');
  };

  const recallOrder = (orderId: number) => {
    const order = heldOrders.find((o) => o.id === orderId);
    if (!order) return;
    if (cart.length > 0) {
      // Merge: giữ đơn hiện tại trước, load đơn cũ
      holdOrder();
    }
    setCart(order.cart);
    const updated = heldOrders.filter((o) => o.id !== orderId);
    setHeldOrders(updated);
    saveHeldOrders(updated);
    setHeldOpen(false);
    message.success('Đã lấy lại đơn');
  };

  const removeHeldOrder = (orderId: number) => {
    const updated = heldOrders.filter((o) => o.id !== orderId);
    setHeldOrders(updated);
    saveHeldOrders(updated);
  };

  // --- Checkout ---
  const openCheckout = () => {
    if (!currentShift) { message.warning('Vui lòng mở ca trước khi bán hàng'); return; }
    if (cart.length === 0) { message.warning('Giỏ hàng trống'); return; }
    form.resetFields();
    form.setFieldsValue({ payment_method: 'cash', discount_amount: 0, cash_amount: total, cash_given: 0 });
    setCheckoutOpen(true);
  };

  const handleCheckout = async () => {
    const values = await form.validateFields();
    const discountAmt = values.discount_amount || 0;
    const checkoutTotal = total - discountAmt;
    if (values.payment_method === 'cash' || values.payment_method === 'transfer' || values.payment_method === 'mixed') {
      const cashAmt = (values.payment_method === 'cash' || values.payment_method === 'mixed') ? (values.cash_amount || 0) : 0;
      const transferAmt = (values.payment_method === 'transfer' || values.payment_method === 'mixed') ? (values.transfer_amount || 0) : 0;
      if (cashAmt + transferAmt < checkoutTotal) {
        message.error('Tổng tiền mặt + chuyển khoản chưa đủ');
        return;
      }
    }
    setCheckoutLoading(true);
    try {
      const payload = {
        customer_id: values.customer_id || undefined,
        discount_amount: values.discount_amount || 0,
        payment_method: values.payment_method,
        cash_amount: values.payment_method === 'cash' || values.payment_method === 'mixed' ? (values.cash_amount || 0) : 0,
        transfer_amount: values.payment_method === 'transfer' || values.payment_method === 'mixed' ? (values.transfer_amount || 0) : 0,
        cash_given: values.cash_given || 0,
        note: values.note || undefined,
        items: cart.map((c) => ({
          product_id: c.product.id,
          quantity: c.quantity,
          unit: c.unit,
        })),
      };
      await api.post('/invoices', payload);
      message.success('Thanh toán thành công!');
      setCart([]);
      setCheckoutOpen(false);
      fetchProducts(search);
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Lỗi thanh toán');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const paymentMethod = Form.useWatch('payment_method', form);
  const discountAmount = Form.useWatch('discount_amount', form) || 0;
  const finalTotal = total - discountAmount;
  const cashGiven = Form.useWatch('cash_given', form) || 0;
  const cashAmount = Form.useWatch('cash_amount', form) || 0;
  const changeAmount = cashGiven > cashAmount ? cashGiven - cashAmount : 0;

  useEffect(() => {
    if (checkoutOpen && paymentMethod !== 'mixed') {
      form.setFieldsValue({ cash_amount: finalTotal });
    }
  }, [finalTotal, checkoutOpen, paymentMethod, form]);

  const denominations = [20000, 50000, 100000, 200000, 500000];

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* POS Header */}
      <Layout.Header style={{
        background: '#001529',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 48,
        lineHeight: '48px',
      }}>
        <Space>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}
            style={{ color: '#fff' }}>
            Quay lại
          </Button>
          <Typography.Text strong style={{ color: '#fff', fontSize: 16 }}>
            {APP_NAME} — Bán hàng
          </Typography.Text>
        </Space>
        <Space size="middle">
          {currentShift ? (
            <Tag icon={<ClockCircleOutlined />} color="green">
              Ca #{currentShift.id} — {currentShift.user?.name || user?.name}
            </Tag>
          ) : (
            <Tag color="red">Chưa mở ca</Tag>
          )}
          <Typography.Text style={{ color: 'rgba(255,255,255,0.65)' }}>
            {user?.name}
          </Typography.Text>
        </Space>
      </Layout.Header>

      {/* POS Content */}
      <Layout.Content style={{ padding: 16 }}>
      <Row gutter={16} style={{ height: 'calc(100vh - 80px)' }}>
      {/* Danh sách sản phẩm */}
      <Col span={14}>
        <Input ref={searchRef} prefix={<SearchOutlined />} placeholder="Tìm tên, SKU, barcode..." value={search}
          onChange={(e) => setSearch(e.target.value)} allowClear size="large" style={{ marginBottom: 12 }} autoFocus />
        <div style={{ height: 'calc(100vh - 230px)', overflowY: 'auto' }}>
          <Row gutter={[8, 8]}>
            {products.map((p) => (
              <Col span={8} key={p.id}>
                <Card size="small" hoverable onClick={() => addToCart(p)}
                  style={{ cursor: 'pointer', opacity: p.stock <= 0 ? 0.5 : 1 }}>
                  <Typography.Text strong ellipsis style={{ display: 'block' }}>{p.name}</Typography.Text>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <Typography.Text type="secondary">{formatVND(p.sell_price)}</Typography.Text>
                    <Tag color={p.stock > 0 ? 'blue' : 'red'}>{p.stock} {p.unit}</Tag>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </Col>

      {/* Giỏ hàng */}
      <Col span={10}>
        <Card
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><ShoppingCartOutlined /> Giỏ hàng ({cart.length} SP)</span>
              <Space size="small">
                <Badge count={heldOrders.length} size="small">
                  <Button size="small" icon={<PlayCircleOutlined />} onClick={() => setHeldOpen(true)}
                    disabled={heldOrders.length === 0}>
                    Đơn giữ
                  </Button>
                </Badge>
                <Button size="small" icon={<PauseCircleOutlined />} onClick={holdOrder}
                  disabled={cart.length === 0}>
                  Tạm giữ
                </Button>
              </Space>
            </div>
          }
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          bodyStyle={{ flex: 1, overflow: 'auto', padding: '8px 16px' }}
          actions={[
            <div key="total" style={{ padding: '0 16px', textAlign: 'right' }}>
              <Typography.Title level={4} style={{ margin: 0 }}>Tổng: {formatVND(total)}</Typography.Title>
              <Button type="primary" size="large" block onClick={openCheckout} style={{ marginTop: 8 }}
                disabled={cart.length === 0}>
                Thanh toán
              </Button>
            </div>,
          ]}>
          <List dataSource={cart} locale={{ emptyText: 'Chưa chọn sản phẩm' }}
            renderItem={(item) => (
              <List.Item style={{ padding: '8px 0' }} actions={[
                <Button size="small" icon={<DeleteOutlined />} danger onClick={() => removeFromCart(item.product.id)} />,
              ]}>
                <div style={{ flex: 1 }}>
                  <Typography.Text strong>{item.product.name}</Typography.Text>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <Space>
                      <Button size="small" icon={<MinusOutlined />} onClick={() => updateQty(item.product.id, item.quantity - 1)} />
                      <InputNumber size="small" min={1} value={item.quantity} onChange={(v) => updateQty(item.product.id, v || 1)} style={{ width: 60 }} />
                      <Button size="small" icon={<PlusOutlined />} onClick={() => updateQty(item.product.id, item.quantity + 1)} />
                    </Space>
                    <Typography.Text>{formatVND(item.product.sell_price * item.quantity)}</Typography.Text>
                  </div>
                </div>
              </List.Item>
            )}
          />
        </Card>
      </Col>

      {/* Modal thanh toán */}
      <Modal title="Thanh toán" open={checkoutOpen} onOk={handleCheckout} onCancel={() => setCheckoutOpen(false)}
        okText="Xác nhận" cancelText="Hủy" confirmLoading={checkoutLoading} width={500}>
        <Typography.Title level={4} style={{ textAlign: 'center' }}>Tổng: {formatVND(finalTotal)}</Typography.Title>
        <Divider />
        <Form form={form} layout="vertical">
          <Form.Item name="payment_method" label="Phương thức thanh toán" rules={[{ required: true }]}>
            <Select options={[
              { value: 'cash', label: 'Tiền mặt' },
              { value: 'transfer', label: 'Chuyển khoản' },
              { value: 'mixed', label: 'Tiền mặt + CK' },
              { value: 'debt', label: 'Ghi nợ' },
            ]} />
          </Form.Item>
          {paymentMethod === 'debt' && (
            <Form.Item name="customer_id" label="Khách hàng" rules={[{ required: true, message: 'Chọn khách hàng để ghi nợ' }]}>
              <Select placeholder="Chọn khách" showSearch options={customers.map((c) => ({ value: c.id, label: `${c.name}${c.phone ? ` (${c.phone})` : ''}` }))}
                filterOption={(input, option) => (option?.label as string)?.toLowerCase().includes(input.toLowerCase())} />
            </Form.Item>
          )}
          {(paymentMethod === 'cash' || paymentMethod === 'mixed') && (
            <Form.Item name="cash_amount" label="Tiền mặt">
              <InputNumber min={0} style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
            </Form.Item>
          )}
          {(paymentMethod === 'transfer' || paymentMethod === 'mixed') && (
            <Form.Item name="transfer_amount" label="Chuyển khoản">
              <InputNumber min={0} style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
            </Form.Item>
          )}
          {(paymentMethod === 'cash' || paymentMethod === 'mixed') && (
            <>
              <Form.Item name="cash_given" label="Tiền khách đưa">
                <InputNumber min={0} style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
              </Form.Item>
              {/* Nút mệnh giá */}
              <div style={{ marginTop: -12, marginBottom: 16 }}>
                <Space wrap>
                  {denominations.map((d) => (
                    <Button key={d} size="small" onClick={() => form.setFieldsValue({ cash_given: d })}>
                      {(d / 1000)}k
                    </Button>
                  ))}
                </Space>
                {changeAmount > 0 && (
                  <Typography.Text strong style={{ display: 'block', marginTop: 8, color: '#52c41a' }}>
                    Tiền thừa: {formatVND(changeAmount)}
                  </Typography.Text>
                )}
              </div>
            </>
          )}
          <Form.Item name="discount_amount" label="Giảm giá (VNĐ)">
            <InputNumber min={0} max={total} style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
          </Form.Item>
          {paymentMethod !== 'debt' && (
            <Form.Item name="customer_id" label="Khách hàng (tùy chọn)">
              <Select placeholder="Khách lẻ" allowClear showSearch options={customers.map((c) => ({ value: c.id, label: `${c.name}${c.phone ? ` (${c.phone})` : ''}` }))}
                filterOption={(input, option) => (option?.label as string)?.toLowerCase().includes(input.toLowerCase())} />
            </Form.Item>
          )}
          <Form.Item name="note" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      {/* Modal đơn tạm giữ */}
      <Modal title="Đơn tạm giữ" open={heldOpen} onCancel={() => setHeldOpen(false)} footer={null} width={400}>
        {heldOrders.length === 0 ? (
          <Typography.Text type="secondary">Không có đơn nào</Typography.Text>
        ) : (
          <List dataSource={heldOrders} renderItem={(order) => (
            <List.Item actions={[
              <Button size="small" type="primary" onClick={() => recallOrder(order.id)}>Lấy lại</Button>,
              <Button size="small" danger onClick={() => removeHeldOrder(order.id)}>Xóa</Button>,
            ]}>
              <List.Item.Meta
                title={`Đơn #${order.id}`}
                description={`${order.note} — ${order.heldAt}`}
              />
            </List.Item>
          )} />
        )}
      </Modal>
    </Row>
    </Layout.Content>
    </Layout>
  );
}
