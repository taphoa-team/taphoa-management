// Issue #13: Extract shared formatVND
export function formatVND(value: number | null | undefined): string {
  return (value ?? 0).toLocaleString('vi-VN') + 'đ';
}

// Issue #1: Escape HTML to prevent XSS
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Issue #9: App name constant
export const APP_NAME = 'Family Mart';
