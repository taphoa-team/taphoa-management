import React, { useEffect, useState, useCallback } from 'react';
import { Table, Button, Modal, Form, InputNumber, Input, message, Typography, Tag, Space, Descriptions } from 'antd';
import { PlayCircleOutlined, StopOutlined } from '@ant-design/icons';
import api from '../services/api';
import { Shift } from '../types';
import { formatVND } from '../utils/format';

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [openForm] = Form.useForm();
  const [closeForm] = Form.useForm();

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/shifts', { params: { limit: 20 } });
      setShifts(res.data || []);
    } catch { message.error('Lỗi tải dữ liệu'); }
    setLoading(false);
  }, []);

  const fetchCurrentShift = useCallback(async () => {
    try {
      const res = await api.get('/shifts/current');
      setCurrentShift(res.data);
    } catch {
      setCurrentShift(null);
    }
  }, []);

  useEffect(() => { fetchShifts(); fetchCurrentShift(); }, [fetchShifts, fetchCurrentShift]);

  const handleOpen = async () => {
    const values = await openForm.validateFields();
    try {
      await api.post('/shifts/open', values);
      message.success('Đã mở ca');
      setOpenModal(false);
      openForm.resetFields();
      fetchShifts();
      fetchCurrentShift();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Lỗi');
    }
  };

  const handleClose = async () => {
    if (!currentShift) return;
    const values = await closeForm.validateFields();
    try {
      const res = await api.post(`/shifts/${currentShift.id}/close`, values);
      const shift = res.data;
      message.success('Đã đóng ca');
      setCloseModal(false);
      closeForm.resetFields();
      fetchShifts();
      fetchCurrentShift();
      // Hiện kết quả đối soát
      Modal.info({
        title: 'Kết quả đóng ca',
        width: 500,
        content: (
          <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
            <Descriptions.Item label="Tiền đầu ca">{formatVND(shift.opening_cash)}</Descriptions.Item>
            <Descriptions.Item label="Doanh thu">{formatVND(shift.total_sales)}</Descriptions.Item>
            <Descriptions.Item label="Số đơn">{shift.total_invoices}</Descriptions.Item>
            <Descriptions.Item label="Tiền mặt lý thuyết">{formatVND(shift.expected_cash)}</Descriptions.Item>
            <Descriptions.Item label="Tiền mặt thực tế">{formatVND(shift.closing_cash)}</Descriptions.Item>
            <Descriptions.Item label="Chênh lệch">
              <Tag color={shift.difference === 0 ? 'green' : 'red'}>{formatVND(shift.difference)}</Tag>
            </Descriptions.Item>
          </Descriptions>
        ),
      });
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Lỗi');
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: 'Nhân viên', dataIndex: ['user', 'name'], width: 130 },
    { title: 'Mở ca', dataIndex: 'opened_at', render: (v: string) => new Date(v).toLocaleString('vi-VN') },
    {
      title: 'Đóng ca', dataIndex: 'closed_at',
      render: (v: string | null) => v ? new Date(v).toLocaleString('vi-VN') : <Tag color="blue">Đang mở</Tag>,
    },
    { title: 'Doanh thu', dataIndex: 'total_sales', render: formatVND, align: 'right' as const, width: 130 },
    { title: 'Số đơn', dataIndex: 'total_invoices', width: 80, align: 'right' as const },
    {
      title: 'Chênh lệch', dataIndex: 'difference', width: 120,
      render: (v: number | null) => v !== null ? <Tag color={v === 0 ? 'green' : 'red'}>{formatVND(v)}</Tag> : '—',
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Ca bán hàng</Typography.Title>
        <Space>
          {currentShift ? (
            <Button type="primary" danger icon={<StopOutlined />} onClick={() => setCloseModal(true)}>
              Đóng ca
            </Button>
          ) : (
            <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => { openForm.resetFields(); setOpenModal(true); }}>
              Mở ca
            </Button>
          )}
        </Space>
      </div>
      {currentShift && (
        <Descriptions bordered size="small" column={3} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Ca hiện tại">#{currentShift.id}</Descriptions.Item>
          <Descriptions.Item label="Tiền đầu ca">{formatVND(currentShift.opening_cash)}</Descriptions.Item>
          <Descriptions.Item label="Doanh thu">{formatVND(currentShift.total_sales)}</Descriptions.Item>
        </Descriptions>
      )}
      <Table dataSource={shifts} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 20 }} size="middle" />

      <Modal title="Mở ca mới" open={openModal} onOk={handleOpen} onCancel={() => setOpenModal(false)} okText="Mở ca" cancelText="Hủy">
        <Form form={openForm} layout="vertical">
          <Form.Item name="opening_cash" label="Tiền đầu ca (VNĐ)" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Đóng ca" open={closeModal} onOk={handleClose} onCancel={() => setCloseModal(false)} okText="Đóng ca" cancelText="Hủy">
        <Form form={closeForm} layout="vertical">
          <Form.Item name="closing_cash" label="Tiền mặt thực tế cuối ca (VNĐ)" rules={[{ required: true, message: 'Nhập số tiền' }]}>
            <InputNumber min={0} style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
