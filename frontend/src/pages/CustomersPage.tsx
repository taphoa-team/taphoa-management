import React, { useEffect, useState, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, message, Space, Typography, Tag } from 'antd';
import { PlusOutlined, EditOutlined, SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Customer } from '../types';
import { formatVND } from '../utils/format';

export default function CustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [form] = Form.useForm();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (search) params.search = search;
      const res = await api.get('/customers', { params });
      setCustomers(res.data || []);
    } catch {
      message.error('Lỗi tải khách hàng');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const openCreate = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (c: Customer) => { setEditing(c); form.setFieldsValue(c); setModalOpen(true); };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await api.put(`/customers/${editing.id}`, values);
        message.success('Đã cập nhật');
      } else {
        await api.post('/customers', values);
        message.success('Đã thêm khách hàng');
      }
      setModalOpen(false);
      fetchCustomers();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Lỗi');
    }
  };

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
      render: (v: number) => v > 0 ? <Tag color="red">{formatVND(v)}</Tag> : <Tag color="green">0đ</Tag>,
    },
    {
      title: 'Thao tác', width: 160,
      render: (_: any, r: Customer) => (
        <Space>
          <Button icon={<EyeOutlined />} size="small" onClick={() => navigate(`/customers/${r.id}`)}>Chi tiết</Button>
          <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(r)}>Sửa</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Khách hàng</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Thêm KH</Button>
      </div>
      <Input prefix={<SearchOutlined />} placeholder="Tìm tên, SĐT..." value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)} allowClear style={{ width: 280, marginBottom: 16 }} />
      <Table dataSource={customers} columns={columns} rowKey="id" loading={loading}
        pagination={{ current: page, pageSize: 20, onChange: setPage, showSizeChanger: false }} size="middle" />
      <Modal title={editing ? 'Sửa khách hàng' : 'Thêm khách hàng'} open={modalOpen}
        onOk={handleSubmit} onCancel={() => setModalOpen(false)} okText={editing ? 'Cập nhật' : 'Thêm'} cancelText="Hủy">
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Tên" rules={[{ required: true, message: 'Nhập tên' }]}><Input /></Form.Item>
          <Form.Item name="phone" label="SĐT"><Input /></Form.Item>
          <Form.Item name="address" label="Địa chỉ"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
