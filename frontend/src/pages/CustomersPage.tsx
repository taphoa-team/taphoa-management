import { PlusOutlined, EditOutlined, SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { Table, Button, Modal, Form, Input, message, Space, Tag } from 'antd';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { PageHeader, EmptyState } from '../components/common';
import { PAGE_SIZE, DEBOUNCE_DELAY } from '../constants';
import { useCustomers, useCreateCustomer, useUpdateCustomer } from '../hooks';
import type { Customer } from '../types';
import { formatVND, getErrorMessage } from '../utils/format';

export default function CustomersPage() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [form] = Form.useForm();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, DEBOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: customers = [], isLoading } = useCustomers({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
  });
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };
  const openEdit = (c: Customer) => {
    setEditing(c);
    form.setFieldsValue(c);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await updateCustomer.mutateAsync({ id: editing.id, data: values });
        message.success('Đã cập nhật');
      } else {
        await createCustomer.mutateAsync(values);
        message.success('Đã thêm khách hàng');
      }
      setModalOpen(false);
    } catch (err: unknown) {
      console.error('Error saving customer:', err);
      message.error(getErrorMessage(err, 'Lỗi lưu khách hàng'));
    }
  };

  const isSaving = createCustomer.isPending || updateCustomer.isPending;

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: 'Tên', dataIndex: 'name' },
    { title: 'SĐT', dataIndex: 'phone', width: 130 },
    { title: 'Địa chỉ', dataIndex: 'address', ellipsis: true },
    {
      title: 'Công nợ',
      dataIndex: 'total_debt',
      width: 130,
      align: 'right' as const,
      render: (v: number) =>
        v > 0 ? <Tag color="red">{formatVND(v)}</Tag> : <Tag color="green">0đ</Tag>,
    },
    {
      title: 'Thao tác',
      width: 160,
      render: (_: unknown, r: Customer) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            size="small"
            onClick={() => navigate(`/customers/${r.id}`)}
          >
            Chi tiết
          </Button>
          <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(r)}>
            Sửa
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Khách hàng"
        subtitle="Quản lý danh sách khách hàng và công nợ"
        actionText="Thêm KH"
        actionIcon={<PlusOutlined />}
        onAction={openCreate}
      />
      <Input
        prefix={<SearchOutlined />}
        placeholder="Tìm tên, SĐT..."
        value={searchInput}
        onChange={e => setSearchInput(e.target.value)}
        allowClear
        style={{ width: 280, marginBottom: 16 }}
      />
      <Table
        dataSource={customers}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          onChange: setPage,
          showSizeChanger: false,
        }}
        size="middle"
        locale={{
          emptyText: (
            <EmptyState
              title="Chưa có khách hàng nào"
              description="Thêm khách hàng đầu tiên để quản lý công nợ"
              actionText="Thêm khách hàng"
              onAction={openCreate}
              showAction
            />
          ),
        }}
      />
      <Modal
        title={editing ? 'Sửa khách hàng' : 'Thêm khách hàng'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        okText={editing ? 'Cập nhật' : 'Thêm'}
        cancelText="Hủy"
        confirmLoading={isSaving}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Tên" rules={[{ required: true, message: 'Nhập tên' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="SĐT">
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Địa chỉ">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
