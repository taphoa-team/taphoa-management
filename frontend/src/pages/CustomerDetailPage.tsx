import React, { useEffect, useState, useCallback } from 'react';
import { Descriptions, Table, Typography, Tag, Button, Modal, Form, InputNumber, Input, message, Spin } from 'antd';
import { ArrowLeftOutlined, DollarOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Customer, Invoice, Debt } from '../types';
import { formatVND, inputNumberFormatter, formatDate, getErrorMessage } from '../utils/format';

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [payModal, setPayModal] = useState(false);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/customers/${id}`);
      setCustomer(res.data.customer);
      setInvoices(res.data.invoices || []);
      setDebts(res.data.debts || []);
    } catch {
      message.error('Không tìm thấy khách hàng');
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePayDebt = async () => {
    const values = await form.validateFields();
    try {
      await api.post(`/customers/${id}/debt-payment`, values);
      message.success('Đã ghi nhận trả nợ');
      setPayModal(false);
      form.resetFields();
      fetchData();
    } catch (err: unknown) {
      message.error(getErrorMessage(err));
    }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!customer) return null;

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/customers')} style={{ marginBottom: 16 }}>
        Quay lại
      </Button>
      <Typography.Title level={4}>{customer.name}</Typography.Title>
      <Descriptions bordered size="small" column={2} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="SĐT">{customer.phone || '—'}</Descriptions.Item>
        <Descriptions.Item label="Địa chỉ">{customer.address || '—'}</Descriptions.Item>
        <Descriptions.Item label="Tổng nợ">
          <Tag color={customer.total_debt > 0 ? 'red' : 'green'}>{formatVND(customer.total_debt)}</Tag>
          {customer.total_debt > 0 && (
            <Button size="small" type="primary" icon={<DollarOutlined />} onClick={() => setPayModal(true)} style={{ marginLeft: 8 }}>
              Ghi nhận trả nợ
            </Button>
          )}
        </Descriptions.Item>
      </Descriptions>

      <Typography.Title level={5}>Lịch sử mua hàng (20 gần nhất)</Typography.Title>
      <Table dataSource={invoices} rowKey="id" size="small" pagination={false} style={{ marginBottom: 24 }}
        columns={[
          { title: 'Mã', dataIndex: 'id', width: 60 },
          { title: 'Ngày', dataIndex: 'created_at', render: (v: string) => formatDate(v) },
          { title: 'Tổng tiền', dataIndex: 'final_total', render: formatVND, align: 'right' as const },
          { title: 'Thanh toán', dataIndex: 'payment_method' },
          { title: 'Trạng thái', dataIndex: 'status', render: (v: string) => <Tag color={v === 'completed' ? 'green' : 'red'}>{v}</Tag> },
        ]}
      />

      <Typography.Title level={5}>Lịch sử công nợ (50 gần nhất)</Typography.Title>
      <Table dataSource={debts} rowKey="id" size="small" pagination={false}
        columns={[
          { title: 'Ngày', dataIndex: 'created_at', render: (v: string) => formatDate(v) },
          { title: 'Loại', dataIndex: 'type', render: (v: string) => <Tag color={v === 'debt' ? 'red' : 'green'}>{v === 'debt' ? 'Nợ' : 'Trả'}</Tag> },
          { title: 'Số tiền', dataIndex: 'amount', render: formatVND, align: 'right' as const },
          { title: 'Ghi chú', dataIndex: 'note' },
        ]}
      />

      <Modal title="Ghi nhận trả nợ" open={payModal} onOk={handlePayDebt} onCancel={() => setPayModal(false)} okText="Ghi nhận" cancelText="Hủy">
        <Form form={form} layout="vertical">
          <Form.Item name="amount" label={`Số tiền (tối đa ${formatVND(customer.total_debt)})`}
            rules={[{ required: true, message: 'Nhập số tiền' }]}>
            <InputNumber min={1} max={customer.total_debt} style={{ width: '100%' }}
              formatter={inputNumberFormatter} />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
