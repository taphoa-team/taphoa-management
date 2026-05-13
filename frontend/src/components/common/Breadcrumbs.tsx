import { HomeOutlined } from '@ant-design/icons';
import { Breadcrumb } from 'antd';
import { memo, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { breadcrumbContainer } from '../../styles/common';

// Mapping route → label
const routeLabels: Record<string, string> = {
  '/': 'Tổng quan',
  '/alerts': 'Cảnh báo',
  '/invoices': 'Lịch sử đơn',
  '/invoices/:id': 'Chi tiết đơn',
  '/shifts': 'Ca bán hàng',
  '/returns': 'Trả hàng',
  '/products': 'Sản phẩm',
  '/categories': 'Nhóm hàng',
  '/inventory': 'Tồn kho',
  '/purchase-orders': 'Nhập hàng',
  '/suppliers': 'Nhà cung cấp',
  '/inventory-checks': 'Kiểm kê',
  '/waste': 'Xuất hủy',
  '/customers': 'Khách hàng',
  '/customers/:id': 'Chi tiết khách',
  '/debts': 'Công nợ',
  '/pos': 'Bán hàng',
  '/reports': 'Báo cáo',
};

// Route nằm trong menu group → hiện breadcrumb: Tổng quan > Group > Page
const routeGroups: Record<string, { label: string }> = {
  '/invoices': { label: 'Đơn hàng' },
  '/shifts': { label: 'Đơn hàng' },
  '/returns': { label: 'Đơn hàng' },
  '/products': { label: 'Hàng hóa' },
  '/categories': { label: 'Hàng hóa' },
  '/inventory': { label: 'Kho' },
  '/purchase-orders': { label: 'Kho' },
  '/suppliers': { label: 'Kho' },
  '/inventory-checks': { label: 'Kho' },
  '/waste': { label: 'Kho' },
  '/customers': { label: 'Khách hàng' },
  '/debts': { label: 'Khách hàng' },
};

// Các route có dynamic segment cần xử lý đặc biệt
const dynamicRoutePatterns = [
  {
    pattern: /^\/invoices\/\d+$/,
    label: 'Chi tiết đơn',
    parent: '/invoices',
    parentLabel: 'Lịch sử đơn',
    group: 'Đơn hàng',
  },
  {
    pattern: /^\/customers\/\d+$/,
    label: 'Chi tiết khách',
    parent: '/customers',
    parentLabel: 'Danh sách',
    group: 'Khách hàng',
  },
];

interface BreadcrumbItem {
  path: string;
  label: string;
  isLast: boolean;
}

/**
 * Component Breadcrumbs tự động sinh từ route hiện tại
 * Hiển thị đường dẫn để user biết đang ở đâu
 *
 * 🚀 Đã wrap với React.memo và useMemo để tối ưu re-render
 *
 * @example
 * <Breadcrumbs />
 */
export const Breadcrumbs: React.FC = memo(function Breadcrumbs() {
  const location = useLocation();
  const pathname = location.pathname;

  // 🎯 Memoize breadcrumb items - chỉ tính lại khi pathname thay đổi
  const items = useMemo<BreadcrumbItem[]>(() => {
    const result: BreadcrumbItem[] = [];

    // Kiểm tra dynamic routes trước
    const dynamicMatch = dynamicRoutePatterns.find(p => p.pattern.test(pathname));

    if (dynamicMatch) {
      // Home
      result.push({ path: '/', label: 'Tổng quan', isLast: false });
      // Group (nếu có)
      if (dynamicMatch.group) {
        result.push({ path: '', label: dynamicMatch.group, isLast: false });
      }
      // Parent
      result.push({ path: dynamicMatch.parent, label: dynamicMatch.parentLabel, isLast: false });
      // Current
      result.push({ path: pathname, label: dynamicMatch.label, isLast: true });
    } else {
      // Home
      const isHome = pathname === '/';
      result.push({ path: '/', label: 'Tổng quan', isLast: isHome });

      if (!isHome) {
        // Group (nếu route thuộc menu group)
        const group = routeGroups[pathname];
        if (group) {
          result.push({ path: '', label: group.label, isLast: false });
        }
        // Current page
        const label = routeLabels[pathname] || pathname.split('/').filter(Boolean).pop() || '';
        result.push({ path: pathname, label, isLast: true });
      }
    }

    return result;
  }, [pathname]);

  // 🎯 Memoize breadcrumb items cho Ant Design - chỉ tính lại khi items thay đổi
  const breadcrumbItems = useMemo(
    () =>
      items.map((item, index) => ({
        key: item.path || `group-${index}`,
        title: item.isLast ? (
          <span>{item.label}</span>
        ) : item.path === '/' ? (
          <Link to="/"><HomeOutlined /></Link>
        ) : item.path === '' ? (
          <span>{item.label}</span>
        ) : (
          <Link to={item.path}>{item.label}</Link>
        ),
      })),
    [items]
  );

  // Không hiển thị breadcrumbs ở trang chủ và POS
  if (pathname === '/' || pathname === '/pos') {
    return null;
  }

  return (
    <div style={breadcrumbContainer}>
      <Breadcrumb items={breadcrumbItems} />
    </div>
  );
});

export default Breadcrumbs;
