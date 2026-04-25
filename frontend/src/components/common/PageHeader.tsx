import { Typography, Button, Space } from 'antd';
import type { ButtonProps } from 'antd/es/button';
import { memo } from 'react';

import { pageHeaderStyle, pageTitleStyle } from '../../styles/common';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actionText?: string;
  actionIcon?: React.ReactNode;
  onAction?: () => void;
  actionProps?: ButtonProps;
  extra?: React.ReactNode;
}

/**
 * Component PageHeader dùng chung cho các trang quản lý
 * Đồng nhất layout: [Tiêu đề] + [Nút primary action]
 * Nếu không truyền onAction → tự ẩn nút action
 *
 * 🚀 Đã wrap với React.memo để tối ưu re-render
 */
export const PageHeader: React.FC<PageHeaderProps> = memo(function PageHeader({
  title,
  subtitle,
  actionText = 'Thêm mới',
  actionIcon,
  onAction,
  actionProps,
  extra,
}) {
  return (
    <div style={pageHeaderStyle}>
      <div>
        <Typography.Title level={4} style={pageTitleStyle}>
          {title}
        </Typography.Title>
        {subtitle && (
          <Typography.Text type="secondary" style={{ fontSize: 14 }}>
            {subtitle}
          </Typography.Text>
        )}
      </div>
      <Space>
        {extra}
        {onAction && (
          <Button type="primary" icon={actionIcon} onClick={onAction} {...actionProps}>
            {actionText}
          </Button>
        )}
      </Space>
    </div>
  );
});

export default PageHeader;
