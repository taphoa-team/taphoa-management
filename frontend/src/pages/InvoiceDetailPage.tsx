import { ArrowLeftOutlined } from '@ant-design/icons';
import { Descriptions, Table, Typography, Tag, Button, Spin, message } from 'antd';
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { PAYMENT_LABEL } from '../constants';
import { useInvoice } from '../hooks';
import { formatVND, formatDateTime } from '../utils/format';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: invoice, isLoading, isError } = useInvoice(Number(id));

  useEffect(() => {
    if (isError) {
      message.error('Lỗi tải dữ liệu');
      navigate('/invoices');
    }
  }, [isError, navigate]);

  if (isLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!invoice) return null;

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/invoices')}
        style={{ marginBottom: 16 }}
      >
        Quay lại
      </Button>
      <Typography.Title level={4}>Đơn hàng #{invoice.id}</Typography.Title>
      <Descriptions bordered size="small" column={2} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="Nhân viên">{invoice.user?.name}</Descriptions.Item>
        <Descriptions.Item label="Khách hàng">
          {invoice.customer?.name || 'Khách lẻ'}
        </Descriptions.Item>
        <Descriptions.Item label="Ngày">{formatDateTime(invoice.created_at)}</Descriptions.Item>
        <Descriptions.Item label="Trạng thái">
          <Tag color={invoice.status === 'completed' ? 'green' : 'red'}>{invoice.status}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Thanh toán">
          {PAYMENT_LABEL[invoice.payment_method]}
        </Descriptions.Item>
        <Descriptions.Item label="Tổng tiền hàng">{formatVND(invoice.total)}</Descriptions.Item>
        <Descriptions.Item label="Giảm giá">{formatVND(invoice.discount_amount)}</Descriptions.Item>
        <Descriptions.Item label="Thành tiền">
          <strong>{formatVND(invoice.final_total)}</strong>
        </Descriptions.Item>
        {invoice.cash_amount > 0 && (
          <Descriptions.Item label="Tiền mặt">{formatVND(invoice.cash_amount)}</Descriptions.Item>
        )}
        {invoice.transfer_amount > 0 && (
          <Descriptions.Item label="Chuyển khoản">
            {formatVND(invoice.transfer_amount)}
          </Descriptions.Item>
        )}
        {invoice.cash_given > 0 && (
          <Descriptions.Item label="Khách đưa">{formatVND(invoice.cash_given)}</Descriptions.Item>
        )}
        {invoice.change_amount > 0 && (
          <Descriptions.Item label="Trả lại">{formatVND(invoice.change_amount)}</Descriptions.Item>
        )}
        {invoice.note && (
          <Descriptions.Item label="Ghi chú" span={2}>
            {invoice.note}
          </Descriptions.Item>
        )}
      </Descriptions>

      <Typography.Title level={5}>Chi tiết sản phẩm</Typography.Title>
      <Table
        dataSource={invoice.items}
        rowKey="id"
        pagination={false}
        size="small"
        columns={[
          { title: 'Sản phẩm', dataIndex: ['product', 'name'] },
          { title: 'ĐVT', dataIndex: 'unit', width: 80 },
          { title: 'SL', dataIndex: 'quantity', width: 60, align: 'right' as const },
          {
            title: 'Đơn giá',
            dataIndex: 'price',
            render: formatVND,
            align: 'right' as const,
            width: 120,
          },
          {
            title: 'Thành tiền',
            render: (_: unknown, r: { price: number; quantity: number }) =>
              formatVND(r.price * r.quantity),
            align: 'right' as const,
            width: 130,
          },
        ]}
      />
    </div>
  );
}
