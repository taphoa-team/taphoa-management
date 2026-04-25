import { useRef, useEffect } from 'react';

/**
 * ⏮️ usePrevious - Lưu giá trị trước đó của state/prop
 *
 * Dùng cho: So sánh giá trị thay đổi, animations, undo
 *
 * @example
 * const [count, setCount] = useState(0);
 * const prevCount = usePrevious(count);
 *
 * useEffect(() => {
 *   if (count !== prevCount) {
 *     console.log(`Count thay đổi từ ${prevCount} sang ${count}`);
 *   }
 * }, [count, prevCount]);
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  const prevRef = useRef<T | undefined>(undefined);

  useEffect(() => {
    prevRef.current = ref.current;
    ref.current = value;
  }, [value]);

  // eslint-disable-next-line react-hooks/refs -- usePrevious intentionally reads ref during render
  return prevRef.current;
}
