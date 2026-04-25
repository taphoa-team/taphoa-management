import { useState, useCallback } from 'react';

/**
 * 🔀 useToggle - Toggle boolean state
 *
 * Dùng cho: Modal open/close, sidebar collapse, switch toggle
 *
 * @example
 * const [isOpen, toggleOpen, setOpen] = useToggle(false);
 *
 * <Button onClick={toggleOpen}>Toggle Modal</Button>
 * <Modal open={isOpen} onCancel={() => setOpen(false)} />
 */
export function useToggle(initialValue = false): [boolean, () => void, (value: boolean) => void] {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => setValue(v => !v), []);

  return [value, toggle, setValue];
}
