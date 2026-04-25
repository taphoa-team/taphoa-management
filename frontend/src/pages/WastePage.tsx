import { PlusOutlined } from '@ant-design/icons';
import { Table, Modal, Form, Select, InputNumber, Input, message } from 'antd';
import React, { useState } from 'react';

import { PageHeader, EmptyState } from '../components/common';
import { useWasteRecords, useProducts, useProductBatches, useCreateWaste } from '../hooks';
import { formatVND, formatDate, getErrorMessage } from '../utils/format';

export default function WastePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedProductId, setSelectedProductId] = useState<number>(0);
  const [form] = Form.useForm();

  const { data: records = [], isLoading } = useWasteRecords(page);
  const { data: products = [] } = useProducts({ limit: 100 });
  const { data: batches = [] } = useProductBatches(selectedProductId);
  const createWaste = useCreateWaste();

  const onProductChange = (productId: number) => {
    form.setFieldValue('batch_id', undefined);
    setSelectedProductId(productId);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      await createWaste.mutateAsync(values);
      message.success('Đã tạo phiếu hủy');
      setModalOpen(false);
      form.resetFields();
    } catch (err: unknown) {
      message.error(getErrorMessage(err));
    }
  };

  const reasonLabels: Record<string, string> = {
    expired: 'Hết hạn',
    damaged: 'Hư hỏng',
    other: 'Khác',
  };

  const columns = [
    { title: '#', dataIndex: 'id', width: 60 },
    { title: 'Sản phẩm', dataIndex: ['product', 'name'] },
    { title: 'SL', dataIndex: 'quantity', width: 60, align: 'right' as const },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      width: 100,
      render: (v: string) => reasonLabels[v] || v,
    },
    { title: 'NV', dataIndex: ['user', 'name'], width: 120 },
    { title: 'Ghi chú', dataIndex: 'note', ellipsis: true },
    { title: 'Ngày', dataIndex: 'created_at', render: (v: string) => formatDate(v), width: 110 },
  ];

  return (
    <div>
      <PageHeader
        title="Xuất hủy"
        actionText="Tạo phiếu hủy"
        actionIcon={<PlusOutlined />}
        onAction={() => {
          form.resetFields();
          setSelectedProductId(0);
          setModalOpen(true);
        }}
      />
      <Table
        dataSource={records}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ current: page, pageSize: 20, onChange: setPage, showSizeChanger: false }}
        size="middle"
        locale={{ emptyText: <EmptyState title="Chưa có phiếu hủy hàng nào" /> }}
      />

      <Modal
        title="Tạo phiếu xuất hủy"
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        okText="Tạo"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="product_id"
            label="Sản phẩm"
            rules={[{ required: true, message: 'Chọn SP' }]}
          >
            <Select
              placeholder="Chọn SP"
              showSearch
              onChange={onProductChange}
              options={products.map(p => ({ value: p.id, label: `${p.name} (${p.sku})` }))}
              filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
          <Form.Item
            name="batch_id"
            label="Lô hàng"
            rules={[{ required: true, message: 'Chọn lô' }]}
          >
            <Select
              placeholder="Chọn lô"
              options={batches.map(b => ({
                value: b.id,
                label: `Lô #${b.id} — SL: ${b.quantity} — Giá: ${formatVND(b.cost_price)}${b.expiry_date ? ` — HSD: ${formatDate(b.expiry_date)}` : ''}`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="quantity"
            label="Số lượng hủy"
            rules={[{ required: true, message: 'Nhập SL' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="reason"
            label="Lý do"
            rules={[{ required: true, message: 'Chọn lý do' }]}
          >
            <Select
              options={[
                { value: 'expired', label: 'Hết hạn' },
                { value: 'damaged', label: 'Hư hỏng' },
                { value: 'other', label: 'Khác' },
              ]}
            />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
