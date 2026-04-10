// Issue #13: Extract shared formatVND
export function formatVND(value: number | null | undefined): string {
  return (value ?? 0).toLocaleString('vi-VN') + 'đ';
}

// InputNumber formatter — dùng cho Ant Design InputNumber component
export const inputNumberFormatter = (value: string | number | undefined) =>
  `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// Date formatting
export function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString('vi-VN');
}

export function formatDateTime(value: string | Date): string {
  return new Date(value).toLocaleString('vi-VN');
}

// Extract error message from unknown catch error (supports Axios errors)
export function getErrorMessage(err: unknown, fallback = 'Lỗi'): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response?: { data?: { error?: string } } }).response;
    if (res?.data?.error) return res.data.error;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

// Issue #1: Escape HTML to prevent XSS
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
