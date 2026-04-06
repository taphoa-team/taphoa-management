/**
 * Constants - Các hằng số dùng chung trong ứng dụng
 */

// Pagination
export const PAGE_SIZE = 20;
export const POS_PRODUCT_LIMIT = 50;
export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// Debounce
export const DEBOUNCE_DELAY = 300;
export const SEARCH_DEBOUNCE_DELAY = 300;

// POS
export const HELD_ORDERS_KEY = 'taphoa_held_orders';
export const HELD_ORDERS_SEQ_KEY = 'taphoa_held_orders_seq';
export const MIN_TOUCH_TARGET_SIZE = 44; // px - WCAG recommendation

// Animation
export const DEFAULT_ANIMATION_DURATION = 300;
export const TOAST_DURATION = 3; // seconds

// Date/Time
export const DATE_FORMAT = 'DD/MM/YYYY';
export const DATE_TIME_FORMAT = 'DD/MM/YYYY HH:mm';
export const TIME_FORMAT = 'HH:mm';

// App
export const APP_NAME = 'Family Mart';
export const APP_VERSION = '1.0.0';

// API
export const API_TIMEOUT = 30000; // 30 seconds
export const MAX_RETRY_ATTEMPTS = 3;

// Currency
export const CURRENCY_LOCALE = 'vi-VN';
export const CURRENCY_CODE = 'VND';

// Payment methods
export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Tiền mặt' },
  { value: 'transfer', label: 'Chuyển khoản' },
  { value: 'mixed', label: 'Tiền mặt + CK' },
  { value: 'debt', label: 'Ghi nợ' },
] as const;

// Product status
export const PRODUCT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

// Invoice status
export const INVOICE_STATUS = {
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  PENDING: 'pending',
} as const;

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
} as const;

// Denominations for cash payment
export const CASH_DENOMINATIONS = [10000, 20000, 50000, 100000, 200000, 500000];

// Breakpoints (px)
export const BREAKPOINTS = {
  XS: 480,
  SM: 576,
  MD: 768,
  LG: 992,
  XL: 1200,
  XXL: 1600,
} as const;
