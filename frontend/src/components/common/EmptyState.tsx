import { Empty, Button, Typography } from 'antd';
import type { EmptyProps } from 'antd/es/empty';
import React from 'react';

interface EmptyStateProps extends Omit<EmptyProps, 'description'> {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  showAction?: boolean;
}

/**
 * Component EmptyState dùng chung cho các trang danh sách rỗng
 *
 * @example
 * <EmptyState
 *   title="Chưa có sản phẩm nào"
 *   description="Bắt đầu bằng cách thêm sản phẩm đầu tiên"
 *   actionText="Thêm sản phẩm"
 *   onAction={() => openModal()}
 * />
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title = 'Không có dữ liệu',
  description,
  actionText = 'Thêm mới',
  onAction,
  showAction = false,
  ...emptyProps
}) => {
  return (
    <Empty
      image={icon || Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        <div style={{ textAlign: 'center' }}>
          {title && (
            <Typography.Text strong style={{ fontSize: 16, display: 'block', marginBottom: 8 }}>
              {title}
            </Typography.Text>
          )}
          {description && (
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              {description}
            </Typography.Text>
          )}
          {showAction && onAction && (
            <Button type="primary" onClick={onAction}>
              {actionText}
            </Button>
          )}
        </div>
      }
      {...emptyProps}
    />
  );
};

export default EmptyState;
