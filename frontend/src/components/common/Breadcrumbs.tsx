import React from 'react';
import { Breadcrumb } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import { HomeOutlined } from '@ant-design/icons';
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
};

// Các route có dynamic segment cần xử lý đặc biệt
const dynamicRoutePatterns = [
  { pattern: /^\/invoices\/\d+$/, label: 'Chi tiết đơn', parent: '/invoices', parentLabel: 'Lịch sử đơn' },
  { pattern: /^\/customers\/\d+$/, label: 'Chi tiết khách', parent: '/customers', parentLabel: 'Khách hàng' },
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
 * @example
 * <Breadcrumbs />
 */
export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathname = location.pathname;

  // Không hiển thị breadcrumbs ở trang chủ và POS
  if (pathname === '/' || pathname === '/pos') {
    return null;
  }

  const items: BreadcrumbItem[] = [];

  // Kiểm tra dynamic routes trước
  const dynamicMatch = dynamicRoutePatterns.find((p) => p.pattern.test(pathname));
  
  if (dynamicMatch) {
    // Home
    items.push({ path: '/', label: 'Tổng quan', isLast: false });
    // Parent
    items.push({ path: dynamicMatch.parent, label: dynamicMatch.parentLabel, isLast: false });
    // Current
    items.push({ path: pathname, label: dynamicMatch.label, isLast: true });
  } else {
    // Xử lý route thông thường
    const pathSegments = pathname.split('/').filter(Boolean);
    let currentPath = '';

    // Home
    items.push({ path: '/', label: 'Tổng quan', isLast: pathSegments.length === 0 });

    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === pathSegments.length - 1;
      const label = routeLabels[currentPath] || segment;
      items.push({ path: currentPath, label, isLast });
    });
  }

  return (
    <div style={breadcrumbContainer}>
      <Breadcrumb
        items={items.map((item) => ({
          key: item.path,
          title: item.isLast ? (
            <span>{item.label}</span>
          ) : (
            <Link to={item.path}>
              {item.path === '/' ? <HomeOutlined /> : item.label}
            </Link>
          ),
        }))}
      />
    </div>
  );
};

export default Breadcrumbs;
