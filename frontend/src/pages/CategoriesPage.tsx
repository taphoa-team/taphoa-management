import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { Table, Button, Modal, Form, Input, message, Popconfirm, Space } from 'antd';
import React, { useState } from 'react';

import { PageHeader, EmptyState } from '../components/common';
import { useAuth } from '../contexts/useAuth';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '../hooks';
import type { Category } from '../types';
import { getErrorMessage } from '../utils/format';

export default function CategoriesPage() {
  const { user } = useAuth();
  const { data: categories = [], isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form] = Form.useForm();

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    form.setFieldsValue({ name: cat.name });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await updateCategory.mutateAsync({ id: editing.id, data: values });
        message.success('Đã cập nhật');
      } else {
        await createCategory.mutateAsync(values);
        message.success('Đã thêm nhóm hàng');
      }
      setModalOpen(false);
    } catch (err: unknown) {
      message.error(getErrorMessage(err));
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteCategory.mutateAsync(id);
      message.success('Đã xóa');
    } catch (err: unknown) {
      message.error(getErrorMessage(err, 'Không xóa được'));
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: 'Tên nhóm hàng', dataIndex: 'name' },
    {
      title: 'Thao tác',
      width: 160,
      render: (_: unknown, record: Category) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(record)}>
            Sửa
          </Button>
          {user?.role === 'admin' && (
            <Popconfirm title="Xóa nhóm hàng này?" onConfirm={() => handleDelete(record.id)}>
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
        title="Nhóm hàng"
        actionText="Thêm nhóm"
        actionIcon={<PlusOutlined />}
        onAction={openCreate}
      />
      <Table
        dataSource={categories}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        size="middle"
        locale={{
          emptyText: (
            <EmptyState
              title="Chưa có nhóm hàng nào"
              description="Thêm nhóm hàng đầu tiên để phân loại sản phẩm"
              actionText="Thêm nhóm hàng"
              onAction={openCreate}
              showAction
            />
          ),
        }}
      />
      <Modal
        title={editing ? 'Sửa nhóm hàng' : 'Thêm nhóm hàng'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        okText={editing ? 'Cập nhật' : 'Thêm'}
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Tên nhóm"
            rules={[{ required: true, message: 'Nhập tên nhóm hàng' }]}
          >
            <Input placeholder="VD: Đồ uống, Bánh kẹo..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
