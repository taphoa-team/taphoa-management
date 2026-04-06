import React from 'react';
import { Typography, Button, Space } from 'antd';
import type { ButtonProps } from 'antd/es/button';
import { pageHeaderStyle, pageTitleStyle } from '../../styles/common';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actionText?: string;
  actionIcon?: React.ReactNode;
  onAction?: () => void;
  actionProps?: ButtonProps;
  extra?: React.ReactNode;
  showAction?: boolean;
}

/**
 * Component PageHeader dùng chung cho các trang quản lý
 * Đồng nhất layout: [Tiêu đề] + [Nút primary action]
 * 
 * @example
 * <PageHeader
 *   title="Sản phẩm"
 *   subtitle="Quản lý danh sách sản phẩm"
 *   actionText="Thêm SP"
 *   actionIcon={<PlusOutlined />}
 *   onAction={() => openCreate()}
 * />
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  actionText = 'Thêm mới',
  actionIcon,
  onAction,
  actionProps,
  extra,
  showAction = true,
}) => {
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
        {showAction && onAction && (
          <Button type="primary" icon={actionIcon} onClick={onAction} {...actionProps}>
            {actionText}
          </Button>
        )}
      </Space>
    </div>
  );
};

export default PageHeader;
