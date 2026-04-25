import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { Table, Button, Modal, Form, Input, message, Popconfirm, Space } from 'antd';
import React, { useState } from 'react';

import { PageHeader, EmptyState } from '../components/common';
import { useAuth } from '../contexts/useAuth';
import { useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier } from '../hooks';
import type { Supplier } from '../types';
import { getErrorMessage } from '../utils/format';

export default function SuppliersPage() {
  const { user } = useAuth();
  const { data: suppliers = [], isLoading } = useSuppliers();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form] = Form.useForm();

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    form.setFieldsValue(s);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await updateSupplier.mutateAsync({ id: editing.id, data: values });
        message.success('Đã cập nhật');
      } else {
        await createSupplier.mutateAsync(values);
        message.success('Đã thêm NCC');
      }
      setModalOpen(false);
    } catch (err: unknown) {
      message.error(getErrorMessage(err));
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteSupplier.mutateAsync(id);
      message.success('Đã xóa');
    } catch (err: unknown) {
      message.error(getErrorMessage(err, 'Không xóa được'));
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: 'Tên', dataIndex: 'name' },
    { title: 'SĐT', dataIndex: 'phone', width: 140 },
    { title: 'Địa chỉ', dataIndex: 'address', ellipsis: true },
    { title: 'Ghi chú', dataIndex: 'note', ellipsis: true },
    {
      title: 'Thao tác',
      width: 160,
      render: (_: unknown, record: Supplier) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(record)}>
            Sửa
          </Button>
          {user?.role === 'admin' && (
            <Popconfirm title="Xóa NCC này?" onConfirm={() => handleDelete(record.id)}>
              <Button icon={<DeleteOutlined />} size="small" danger>
                Xóa
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Nhà cung cấp"
        actionText="Thêm NCC"
        actionIcon={<PlusOutlined />}
        onAction={openCreate}
      />
      <Table
        dataSource={suppliers}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20 }}
        size="middle"
        locale={{
          emptyText: (
            <EmptyState
              title="Chưa có nhà cung cấp nào"
              description="Thêm nhà cung cấp đầu tiên để quản lý nhập hàng"
              actionText="Thêm nhà cung cấp"
              onAction={openCreate}
              showAction
            />
          ),
        }}
      />
      <Modal
        title={editing ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        okText={editing ? 'Cập nhật' : 'Thêm'}
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Tên NCC" rules={[{ required: true, message: 'Nhập tên' }]}>
            <Input placeholder="VD: Công ty ABC" />
          </Form.Item>
          <Form.Item name="phone" label="SĐT">
            <Input placeholder="0912345678" />
          </Form.Item>
          <Form.Item name="address" label="Địa chỉ">
            <Input placeholder="Số 1, đường ABC..." />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
