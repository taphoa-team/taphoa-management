import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, message, Popconfirm, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../services/api';
import { Category } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader, EmptyState } from '../components/common';
import { getErrorMessage } from '../utils/format';

export default function CategoriesPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form] = Form.useForm();

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch {
      message.error('Lỗi tải nhóm hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

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
        await api.put(`/categories/${editing.id}`, values);
        message.success('Đã cập nhật');
      } else {
        await api.post('/categories', values);
        message.success('Đã thêm nhóm hàng');
      }
      setModalOpen(false);
      fetchCategories();
    } catch (err: unknown) {
      message.error(getErrorMessage(err));
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/categories/${id}`);
      message.success('Đã xóa');
      fetchCategories();
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
      render: (_: any, record: Category) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(record)}>Sửa</Button>
          {user?.role === 'admin' && (
            <Popconfirm title="Xóa nhóm hàng này?" onConfirm={() => handleDelete(record.id)}>
              <Button icon={<DeleteOutlined />} size="small" danger>Xóa</Button>
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
        loading={loading}
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
          <Form.Item name="name" label="Tên nhóm" rules={[{ required: true, message: 'Nhập tên nhóm hàng' }]}>
            <Input placeholder="VD: Đồ uống, Bánh kẹo..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
