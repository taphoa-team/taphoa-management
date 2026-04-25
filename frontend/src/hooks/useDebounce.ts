import { useState, useEffect } from 'react';

/**
 * 🔄 useDebounce - Delay giá trị thay đổi
 *
 * Dùng cho: Search input, autocomplete - tránh gọi API liên tục khi user gõ
 *
 * @example
 * const [search, setSearch] = useState('');
 * const debouncedSearch = useDebounce(search, 500); // Chỉ update sau 500ms
 *
 * useEffect(() => {
 *   api.get(`/products?search=${debouncedSearch}`); // Gọi API sau khi user ngừng gõ
 * }, [debouncedSearch]);
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer); // Clear timer nếu value thay đổi trước khi hết delay
    };
  }, [value, delay]);

  return debouncedValue;
}
