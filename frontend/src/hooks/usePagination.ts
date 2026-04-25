import { useState, useMemo, useCallback } from 'react';

interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  pageSizeOptions?: number[];
}

interface UsePaginationReturn<T> {
  // State
  currentPage: number;
  pageSize: number;
  totalPages: number;

  // Data đã phân trang
  paginatedData: T[];

  // Handlers
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;

  // Ant Design Table compatible
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    showSizeChanger: boolean;
    pageSizeOptions: string[];
    showTotal: (total: number, range: [number, number]) => string;
    onChange: (page: number, pageSize: number) => void;
  };
}

/**
 * 📄 usePagination - Quản lý phân trang
 *
 * Dùng cho: Tables, lists cần phân trang client-side
 *
 * @example
 * const products = [...]; // 1000 items
 * const { paginatedData, pagination } = usePagination(products, { initialPageSize: 20 });
 *
 * <Table dataSource={paginatedData} pagination={pagination} />
 */
export function usePagination<T>(
  data: T[],
  options: UsePaginationOptions = {}
): UsePaginationReturn<T> {
  const { initialPage = 1, initialPageSize = 10, pageSizeOptions = [10, 20, 50, 100] } = options;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const totalPages = useMemo(() => Math.ceil(data.length / pageSize), [data.length, pageSize]);

  // Tính data cho trang hiện tại
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return data.slice(start, end);
  }, [data, currentPage, pageSize]);

  // Handlers
  const setPage = useCallback(
    (page: number) => {
      const validPage = Math.max(1, Math.min(page, totalPages));
      setCurrentPage(validPage);
    },
    [totalPages]
  );

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setCurrentPage(1); // Reset về trang 1 khi đổi pageSize
  }, []);

  const nextPage = useCallback(() => setPage(currentPage + 1), [currentPage, setPage]);
  const prevPage = useCallback(() => setPage(currentPage - 1), [currentPage, setPage]);
  const goToFirstPage = useCallback(() => setPage(1), [setPage]);
  const goToLastPage = useCallback(() => setPage(totalPages), [setPage, totalPages]);

  // Ant Design Table compatible pagination object
  const pagination = useMemo(
    () => ({
      current: currentPage,
      pageSize: pageSize,
      total: data.length,
      showSizeChanger: true,
      pageSizeOptions: pageSizeOptions.map(String),
      showTotal: (total: number, range: [number, number]) =>
        `${range[0]}-${range[1]} của ${total} bản ghi`,
      onChange: (page: number, newPageSize: number) => {
        setCurrentPage(page);
        if (newPageSize !== pageSize) {
          setPageSizeState(newPageSize);
        }
      },
    }),
    [currentPage, pageSize, data.length, pageSizeOptions]
  );

  return {
    currentPage,
    pageSize,
    totalPages,
    paginatedData,
    setPage,
    setPageSize,
    nextPage,
    prevPage,
    goToFirstPage,
    goToLastPage,
    pagination,
  };
}
