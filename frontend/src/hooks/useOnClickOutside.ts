import type { RefObject } from 'react';
import { useEffect } from 'react';

/**
 * 🖱️ useOnClickOutside - Bắt click bên ngoài element
 *
 * Dùng cho: Đóng dropdown, modal, tooltip khi click ra ngoài
 *
 * @example
 * const ref = useRef<HTMLDivElement>(null);
 * const [isOpen, setIsOpen] = useState(false);
 *
 * useOnClickOutside(ref, () => setIsOpen(false));
 *
 * <div ref={ref}>
 *   {isOpen && <Dropdown />}
 * </div>
 */
export function useOnClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: (event: MouseEvent | TouchEvent) => void,
  ignoreRefs?: RefObject<HTMLElement | null>[]
): void {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;

      // Không xử lý nếu click vào chính element hoặc element con
      if (!ref.current || ref.current.contains(target)) {
        return;
      }

      // Kiểm tra các element cần ignore
      if (ignoreRefs?.some(ignoreRef => ignoreRef.current?.contains(target))) {
        return;
      }

      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler, ignoreRefs]);
}
