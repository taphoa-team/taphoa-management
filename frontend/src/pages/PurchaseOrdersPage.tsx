import { PlusOutlined, EyeOutlined } from '@ant-design/icons';
import { Table, Button, Modal, Tag, Typography } from 'antd';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { PageHeader, EmptyState } from '../components/common';
import { usePurchaseOrders, usePurchaseOrder } from '../hooks';
import type { PurchaseOrder } from '../types';
import { formatVND, formatDate } from '../utils/format';

export default function PurchaseOrdersPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<number | null>(null);

  const { data: orders = [], isLoading } = usePurchaseOrders(page);
  const { data: detailModal } = usePurchaseOrder(detailId);

  const columns = [
    { title: '#', dataIndex: 'id', width: 60 },
    { title: 'NCC', dataIndex: ['supplier', 'name'], width: 150 },
    { title: 'Nhân viên', dataIndex: ['user', 'name'], width: 120 },
    { title: 'Tổng', dataIndex: 'total', render: formatVND, align: 'right' as const, width: 130 },
    { title: 'Đã trả', dataIndex: 'paid', render: formatVND, align: 'right' as const, width: 130 },
    {
      title: 'TT',
      dataIndex: 'status',
      width: 100,
      render: (v: string) => <Tag color={v === 'completed' ? 'green' : 'red'}>{v}</Tag>,
    },
    { title: 'Ngày', dataIndex: 'created_at', render: (v: string) => formatDate(v), width: 110 },
    {
      title: '',
      width: 80,
      render: (_: unknown, r: PurchaseOrder) => (
        <Button icon={<EyeOutlined />} size="small" onClick={() => setDetailId(r.id)}>
          Xem
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Nhập hàng"
        actionText="Tạo đơn nhập"
        actionIcon={<PlusOutlined />}
        onAction={() => navigate('/purchase-orders/new')}
      />
      <Table
        dataSource={orders}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ current: page, pageSize: 20, onChange: setPage, showSizeChanger: false }}
        size="middle"
        locale={{
          emptyText: (
            <EmptyState
              title="Chưa có phiếu nhập hàng"
              description="Tạo phiếu nhập hàng đầu tiên"
            />
          ),
        }}
      />

      {/* Modal chi tiết */}
      <Modal
        title={`Đơn nhập #${detailModal?.id}`}
        open={!!detailId}
        onCancel={() => setDetailId(null)}
        footer={null}
        width={700}
      >
        {detailModal && (
          <>
            <Typography.Text>
              NCC: <strong>{detailModal.supplier?.name}</strong> | Tổng:{' '}
              <strong>{formatVND(detailModal.total)}</strong>
            </Typography.Text>
            <Table
              dataSource={detailModal.items}
              rowKey="id"
              pagination={false}
              size="small"
              style={{ marginTop: 16 }}
              columns={[
                { title: 'Sản phẩm', dataIndex: ['product', 'name'] },
                { title: 'SL', dataIndex: 'quantity', width: 60 },
                { title: 'ĐVT', dataIndex: 'unit', width: 80 },
                { title: 'Giá nhập', dataIndex: 'cost_price', render: formatVND, width: 120 },
                {
                  title: 'Thành tiền',
                  render: (_: unknown, r: { cost_price: number; quantity: number }) =>
                    formatVND(r.cost_price * r.quantity),
                  width: 130,
                },
              ]}
            />
          </>
        )}
      </Modal>
    </div>
  );
}
