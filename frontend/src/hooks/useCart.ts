import { useState, useCallback, useEffect } from 'react';
import { message } from 'antd';
import { ProductWithStock } from '../types';
import { HELD_ORDERS_KEY, HELD_ORDERS_SEQ_KEY } from '../constants';

export interface CartItem {
  product: ProductWithStock;
  quantity: number;
  unit: string;
}

export interface ActiveOrder {
  id: number;
  items: CartItem[];
  note?: string;
  createdAt: string;
}

export interface HeldOrder {
  id: number;
  cart: CartItem[];
  note: string;
  heldAt: string;
}

interface UseCartOptions {
  maxOrders?: number;
  onOrderChange?: (orders: ActiveOrder[], activeId: number) => void;
}

interface UseCartReturn {
  // Orders state
  activeOrders: ActiveOrder[];
  activeOrderId: number;
  activeOrder: ActiveOrder;
  heldOrders: HeldOrder[];
  // Số thứ tự hiển thị của active order (1, 2, 3...)
  activeOrderIndex: number;
  
  // Cart items của active order
  items: CartItem[];
  total: number;
  itemCount: number;
  
  // Actions
  addToCart: (product: ProductWithStock, quantity?: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  removeFromCart: (productId: number) => void;
  clearCart: () => void;
  
  // Order management
  createNewOrder: () => void;
  switchOrder: (id: number) => void;
  closeOrderTab: (id: number) => void;
  
  // Hold orders
  holdOrder: (note?: string) => void;
  recallOrder: (orderId: number) => void;
  removeHeldOrder: (orderId: number) => void;
  
  // Helper
  isProductInCart: (productId: number) => boolean;
  getCartItem: (productId: number) => CartItem | undefined;
}

// Helper functions cho localStorage
function loadHeldOrders(): HeldOrder[] {
  try {
    const data = localStorage.getItem(HELD_ORDERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading held orders:', error);
    return [];
  }
}

function saveHeldOrders(orders: HeldOrder[]): void {
  try {
    localStorage.setItem(HELD_ORDERS_KEY, JSON.stringify(orders));
  } catch (error) {
    console.error('Error saving held orders:', error);
  }
}

function nextHeldId(): number {
  try {
    const seq = parseInt(localStorage.getItem(HELD_ORDERS_SEQ_KEY) || '0', 10) + 1;
    localStorage.setItem(HELD_ORDERS_SEQ_KEY, String(seq));
    return seq;
  } catch (error) {
    console.error('Error generating held order id:', error);
    return Date.now();
  }
}

/**
 * Hook để quản lý giỏ hàng và đơn hàng trong POS
 * Tách biệt logic giỏ hàng khỏi component POSPage
 * 
 * @example
 * const {
 *   items, total, addToCart, updateQuantity, removeFromCart,
 *   activeOrders, switchOrder, holdOrder, recallOrder
 * } = useCart();
 */
export function useCart(options: UseCartOptions = {}): UseCartReturn {
  const { maxOrders = 10, onOrderChange } = options;

  // Dùng Date.now() để đảm bảo id unique, nhưng hiển thị theo thứ tự
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([
    { id: Date.now(), items: [], createdAt: new Date().toISOString() },
  ]);
  const [activeOrderId, setActiveOrderId] = useState<number>(Date.now());
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>(loadHeldOrders);

  const activeOrder = activeOrders.find((o) => o.id === activeOrderId) || activeOrders[0];
  const activeOrderIndex = activeOrders.findIndex((o) => o.id === activeOrderId) + 1;
  const items = activeOrder.items;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce((sum, item) => sum + item.product.sell_price * item.quantity, 0);

  // Callback khi orders thay đổi
  useEffect(() => {
    onOrderChange?.(activeOrders, activeOrderId);
  }, [activeOrders, activeOrderId, onOrderChange]);

  const updateActiveOrderItems = useCallback((newItems: CartItem[]) => {
    setActiveOrders((prev) =>
      prev.map((o) => (o.id === activeOrderId ? { ...o, items: newItems } : o))
    );
  }, [activeOrderId]);

  const addToCart = useCallback((product: ProductWithStock, quantity = 1) => {
    if (product.stock <= 0) {
      message.warning('Sản phẩm đã hết hàng');
      return;
    }

    const existing = items.find((item) => item.product.id === product.id);
    
    if (existing) {
      // Kiểm tra tồn kho
      if (existing.quantity + quantity > product.stock) {
        message.warning('Số lượng trong giỏ đã đạt tồn kho');
        return;
      }
      updateActiveOrderItems(
        items.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      );
    } else {
      if (quantity > product.stock) {
        message.warning('Số lượng vượt quá tồn kho');
        return;
      }
      updateActiveOrderItems([
        ...items,
        { product, quantity, unit: product.unit },
      ]);
    }

    message.success(`Đã thêm ${product.name}`);
  }, [items, updateActiveOrderItems]);

  const updateQuantity = useCallback((productId: number, quantity: number) => {
    if (quantity <= 0) {
      updateActiveOrderItems(items.filter((item) => item.product.id !== productId));
      return;
    }

    const item = items.find((i) => i.product.id === productId);
    if (item && quantity > item.product.stock) {
      message.warning('Số lượng vượt quá tồn kho');
      return;
    }

    updateActiveOrderItems(
      items.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  }, [items, updateActiveOrderItems]);

  const removeFromCart = useCallback((productId: number) => {
    updateActiveOrderItems(items.filter((item) => item.product.id !== productId));
  }, [items, updateActiveOrderItems]);

  const clearCart = useCallback(() => {
    updateActiveOrderItems([]);
  }, [updateActiveOrderItems]);

  const isProductInCart = useCallback((productId: number) => {
    return items.some((item) => item.product.id === productId);
  }, [items]);

  const getCartItem = useCallback((productId: number) => {
    return items.find((item) => item.product.id === productId);
  }, [items]);

  // Multi-order management
  const createNewOrder = useCallback(() => {
    if (activeOrders.length >= maxOrders) {
      message.warning(`Tối đa ${maxOrders} đơn hàng`);
      return;
    }

    const newId = Date.now();
    setActiveOrders((prev) => [
      ...prev,
      { id: newId, items: [], createdAt: new Date().toISOString() },
    ]);
    setActiveOrderId(newId);
  }, [activeOrders.length, maxOrders]);

  const switchOrder = useCallback((id: number) => {
    setActiveOrderId(id);
  }, []);

  const closeOrderTab = useCallback((id: number) => {
    const order = activeOrders.find((o) => o.id === id);
    if (!order) return;

    if (order.items.length > 0) {
      message.warning('Vui lòng thanh toán hoặc tạm giữ đơn trước khi đóng');
      return;
    }

    const remaining = activeOrders.filter((o) => o.id !== id);
    if (remaining.length === 0) {
      // Nếu không còn đơn nào, tạo đơn mới
      const newId = Date.now();
      setActiveOrders([{ id: newId, items: [], createdAt: new Date().toISOString() }]);
      setActiveOrderId(newId);
    } else {
      setActiveOrders(remaining);
      if (activeOrderId === id) {
        setActiveOrderId(remaining[remaining.length - 1].id);
      }
    }
  }, [activeOrders, activeOrderId]);

  // Hold orders
  const holdOrder = useCallback((note?: string) => {
    if (items.length === 0) {
      message.warning('Giỏ hàng trống');
      return;
    }

    const formatCurrency = (value: number) => 
      value.toLocaleString('vi-VN') + 'đ';

    const order: HeldOrder = {
      id: nextHeldId(),
      cart: [...items],
      note: note || `${items.length} SP — ${formatCurrency(total)}`,
      heldAt: new Date().toLocaleTimeString('vi-VN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
    };

    const updated = [...heldOrders, order];
    setHeldOrders(updated);
    saveHeldOrders(updated);
    updateActiveOrderItems([]);
    message.success('Đã tạm giữ đơn');
  }, [items, total, heldOrders, updateActiveOrderItems]);

  const recallOrder = useCallback((orderId: number) => {
    const order = heldOrders.find((o) => o.id === orderId);
    if (!order) return;

    // Nếu đơn hiện tại có hàng, tạm giữ trước
    if (items.length > 0) {
      const formatCurrency = (value: number) => 
        value.toLocaleString('vi-VN') + 'đ';

      const held: HeldOrder = {
        id: nextHeldId(),
        cart: [...items],
        note: `${items.length} SP — ${formatCurrency(total)}`,
        heldAt: new Date().toLocaleTimeString('vi-VN', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
      };
      const updatedHeld = [...heldOrders, held];
      setHeldOrders(updatedHeld);
      saveHeldOrders(updatedHeld);
    }

    updateActiveOrderItems(order.cart);
    const updated = heldOrders.filter((o) => o.id !== orderId);
    setHeldOrders(updated);
    saveHeldOrders(updated);
    message.success('Đã lấy lại đơn');
  }, [heldOrders, items, total, updateActiveOrderItems]);

  const removeHeldOrder = useCallback((orderId: number) => {
    const updated = heldOrders.filter((o) => o.id !== orderId);
    setHeldOrders(updated);
    saveHeldOrders(updated);
  }, [heldOrders]);

  return {
    // State
    activeOrders,
    activeOrderId,
    activeOrder,
    activeOrderIndex,
    heldOrders,
    items,
    total,
    itemCount,
    
    // Cart actions
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    
    // Order management
    createNewOrder,
    switchOrder,
    closeOrderTab,
    
    // Hold orders
    holdOrder,
    recallOrder,
    removeHeldOrder,
    
    // Helpers
    isProductInCart,
    getCartItem,
  };
}

export default useCart;
