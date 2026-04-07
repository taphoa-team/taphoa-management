import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, message, Popconfirm, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../services/api';
import { Supplier } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader, EmptyState } from '../components/common';

export default function SuppliersPage() {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form] = Form.useForm();

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/suppliers');
      setSuppliers(res.data);
    } catch {
      message.error('Lỗi tải nhà cung cấp');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSuppliers(); }, []);

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
        await api.put(`/suppliers/${editing.id}`, values);
        message.success('Đã cập nhật');
      } else {
        await api.post('/suppliers', values);
        message.success('Đã thêm NCC');
      }
      setModalOpen(false);
      fetchSuppliers();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Lỗi');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/suppliers/${id}`);
      message.success('Đã xóa');
      fetchSuppliers();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Không xóa được');
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
      render: (_: any, record: Supplier) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(record)}>Sửa</Button>
          {user?.role === 'admin' && (
            <Popconfirm title="Xóa NCC này?" onConfirm={() => handleDelete(record.id)}>
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
        title="Nhà cung cấp"
        actionText="Thêm NCC"
        actionIcon={<PlusOutlined />}
        onAction={openCreate}
      />
      <Table
        dataSource={suppliers}
        columns={columns}
        rowKey="id"
        loading={loading}
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
