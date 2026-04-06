import { useState, useEffect, useCallback, useRef } from 'react';
import { message } from 'antd';
import api from '../services/api';
import { PAGE_SIZE } from '../constants';

interface UseFetchListOptions<T> {
  url: string;
  params?: Record<string, any>;
  pageSize?: number;
  autoFetch?: boolean;
  onError?: (error: unknown) => void;
  onSuccess?: (data: T[]) => void;
}

interface UseFetchListReturn<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize?: number) => void;
  };
  refresh: () => void;
  setPage: (page: number) => void;
}

/**
 * Hook để fetch danh sách dữ liệu với pagination, loading, error handling
 * Tự động quản lý state và gọi API
 * 
 * @example
 * const { data, loading, pagination, refresh } = useFetchList<Product>({
 *   url: '/products',
 *   params: { search: debouncedValue },
 * });
 * 
 * <Table 
 *   dataSource={data} 
 *   loading={loading}
 *   pagination={pagination}
 * />
 */
export function useFetchList<T>(options: UseFetchListOptions<T>): UseFetchListReturn<T> {
  const {
    url,
    params = {},
    pageSize = PAGE_SIZE,
    autoFetch = true,
    onError,
    onSuccess,
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Sử dụng ref để theo dõi component có unmount chưa
  const isMountedRef = useRef(true);

  const fetchData = useCallback(async (page: number) => {
    if (!isMountedRef.current) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.get(url, {
        params: {
          page,
          limit: pageSize,
          ...params,
        },
      });

      if (!isMountedRef.current) return;

      const result = response.data || [];
      // Xử lý cả trường hợp API trả về array hoặc object có data
      const listData = Array.isArray(result) ? result : result.data || [];
      const totalCount = Array.isArray(result) ? result.length : result.total || listData.length;

      setData(listData);
      setTotal(totalCount);
      onSuccess?.(listData);
    } catch (err) {
      if (!isMountedRef.current) return;

      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      onError?.(err);
      
      // Log lỗi để debug, không bỏ qua silent
      console.error(`Error fetching ${url}:`, err);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [url, pageSize, JSON.stringify(params), onError, onSuccess]);

  const refresh = useCallback(() => {
    fetchData(currentPage);
  }, [fetchData, currentPage]);

  const setPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handlePaginationChange = useCallback((page: number, newPageSize?: number) => {
    setCurrentPage(page);
    if (newPageSize && newPageSize !== pageSize) {
      // Nếu pageSize thay đổi, reset về trang 1
      setCurrentPage(1);
    }
  }, [pageSize]);

  useEffect(() => {
    if (autoFetch) {
      fetchData(currentPage);
    }
  }, [autoFetch, fetchData, currentPage]);

  // Cleanup khi unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    data,
    loading,
    error,
    pagination: {
      current: currentPage,
      pageSize,
      total,
      onChange: handlePaginationChange,
    },
    refresh,
    setPage,
  };
}

export default useFetchList;
