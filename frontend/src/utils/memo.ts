import { memo, useMemo } from 'react';

/**
 * 🚀 memoEqual - React.memo với shallow compare
 *
 * Dùng cho: Components nhận props object/array - tránh re-render không cần thiết
 *
 * @example
 * const ProductCard = memoEqual(({ product, onSelect }) => {
 *   return <div>{product.name}</div>;
 * });
 */
export function memoEqual<T extends Record<string, unknown>>(
  Component: React.ComponentType<T>
): React.MemoExoticComponent<React.ComponentType<T>> {
  return memo(Component, (prevProps, nextProps) => {
    const keys = Object.keys(prevProps) as Array<keyof T>;
    return keys.every(key => prevProps[key] === nextProps[key]);
  });
}

/**
 * 🎯 useStableObject - Memoize object để tránh re-render
 *
 * Dùng cho: Object config, style object truyền vào child components
 *
 * @example
 * const style = useStableObject({ color: 'red', fontSize: 14 });
 * // style chỉ thay đổi khi giá trị thực sự khác
 */
export function useStableObject<T extends Record<string, unknown>>(obj: T): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => obj, Object.values(obj));
}

/**
 * 📊 useTableColumns - Memoize table columns
 *
 * Dùng cho: Ant Design Table columns - tránh re-render mỗi lần
 *
 * @example
 * const columns = useTableColumns([
 *   { title: 'Name', dataIndex: 'name' },
 *   { title: 'Price', dataIndex: 'price', render: formatPrice },
 * ]);
 */
export function useTableColumns<T>(
  columns: Array<{
    title: string;
    dataIndex?: string | string[];
    key?: string;
    width?: number;
    align?: 'left' | 'center' | 'right';
    render?: (value: unknown, record: T) => React.ReactNode;
    sorter?: boolean | ((a: T, b: T) => number);
  }>
): typeof columns {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => columns, []);
}
