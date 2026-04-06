import { useState, useEffect, useCallback } from 'react';
import { DEBOUNCE_DELAY } from '../constants';

interface UseDebouncedSearchOptions {
  delay?: number;
  onSearch?: (value: string) => void;
}

/**
 * Hook để debounce search input
 * Tránh gọi API liên tục khi user đang gõ
 * 
 * @example
 * const { searchValue, setSearchValue, debouncedValue } = useDebouncedSearch({ delay: 300 });
 * 
 * useEffect(() => {
 *   fetchProducts(debouncedValue);
 * }, [debouncedValue]);
 */
export function useDebouncedSearch(options: UseDebouncedSearchOptions = {}) {
  const { delay = DEBOUNCE_DELAY, onSearch } = options;
  const [searchValue, setSearchValue] = useState('');
  const [debouncedValue, setDebouncedValue] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(searchValue);
      onSearch?.(searchValue);
    }, delay);

    return () => clearTimeout(timer);
  }, [searchValue, delay, onSearch]);

  const resetSearch = useCallback(() => {
    setSearchValue('');
    setDebouncedValue('');
  }, []);

  return {
    searchValue,
    setSearchValue,
    debouncedValue,
    resetSearch,
  };
}

export default useDebouncedSearch;
