import { PlayCircleOutlined, StopOutlined } from '@ant-design/icons';
import {
  Table,
  Button,
  Modal,
  Form,
  InputNumber,
  Input,
  message,
  Tag,
  Space,
  Descriptions,
} from 'antd';
import React, { useState } from 'react';

import { PageHeader, EmptyState } from '../components/common';
import { useShifts, useCurrentShift, useOpenShift, useCloseShift } from '../hooks';
import type { Shift } from '../types';
import { formatVND, inputNumberFormatter, formatDateTime, getErrorMessage } from '../utils/format';

export default function ShiftsPage() {
  const { data: shifts = [], isLoading } = useShifts(20);
  const { data: currentShift } = useCurrentShift();
  const openShiftMutation = useOpenShift();
  const closeShiftMutation = useCloseShift();

  const [openModal, setOpenModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [openForm] = Form.useForm();
  const [closeForm] = Form.useForm();

  const handleOpen = async () => {
    const values = await openForm.validateFields();
    try {
      await openShiftMutation.mutateAsync(values);
      message.success('Đã mở ca');
      setOpenModal(false);
      openForm.resetFields();
    } catch (err: unknown) {
      message.error(getErrorMessage(err));
    }
  };

  const handleClose = async () => {
    if (!currentShift) return;
    const values = await closeForm.validateFields();
    try {
      const res = await closeShiftMutation.mutateAsync({ id: currentShift.id, data: values });
      const shift = res.data as Shift;
      message.success('Đã đóng ca');
      setCloseModal(false);
      closeForm.resetFields();
      // Hiện kết quả đối soát
      Modal.info({
        title: 'Kết quả đóng ca',
        width: 500,
        content: (
          <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
            <Descriptions.Item label="Tiền đầu ca">
              {formatVND(shift.opening_cash)}
            </Descriptions.Item>
            <Descriptions.Item label="Doanh thu">{formatVND(shift.total_sales)}</Descriptions.Item>
            <Descriptions.Item label="Số đơn">{shift.total_invoices}</Descriptions.Item>
            <Descriptions.Item label="Tiền mặt lý thuyết">
              {formatVND(shift.expected_cash)}
            </Descriptions.Item>
            <Descriptions.Item label="Tiền mặt thực tế">
              {formatVND(shift.closing_cash)}
            </Descriptions.Item>
            <Descriptions.Item label="Chênh lệch">
              <Tag color={shift.difference === 0 ? 'green' : 'red'}>
                {formatVND(shift.difference)}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        ),
      });
    } catch (err: unknown) {
      message.error(getErrorMessage(err));
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: 'Nhân viên', dataIndex: 'cashier_name', width: 130 },
    { title: 'Mở ca', dataIndex: 'opened_at', render: (v: string) => formatDateTime(v) },
    {
      title: 'Đóng ca',
      dataIndex: 'closed_at',
      render: (v: string | null) => (v ? formatDateTime(v) : <Tag color="blue">Đang mở</Tag>),
    },
    {
      title: 'Doanh thu',
      dataIndex: 'total_sales',
      render: formatVND,
      align: 'right' as const,
      width: 130,
    },
    { title: 'Số đơn', dataIndex: 'total_invoices', width: 80, align: 'right' as const },
    {
      title: 'Chênh lệch',
      dataIndex: 'difference',
      width: 120,
      render: (v: number | null) =>
        v !== null ? <Tag color={v === 0 ? 'green' : 'red'}>{formatVND(v)}</Tag> : '—',
    },
  ];

  return (
    <div>
      <PageHeader
        title="Ca bán hàng"
        extra={
          <Space>
            {currentShift ? (
              <Button
                type="primary"
                danger
                icon={<StopOutlined />}
                onClick={() => setCloseModal(true)}
              >
                Đóng ca
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={() => {
                  openForm.resetFields();
                  setOpenModal(true);
                }}
              >
                Mở ca
              </Button>
            )}
          </Space>
        }
      />
      {currentShift && (
        <Descriptions bordered size="small" column={3} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Ca hiện tại">#{currentShift.id}</Descriptions.Item>
          <Descriptions.Item label="Tiền đầu ca">
            {formatVND(currentShift.opening_cash)}
          </Descriptions.Item>
          <Descriptions.Item label="Doanh thu">
            {formatVND(currentShift.total_sales)}
          </Descriptions.Item>
        </Descriptions>
      )}
      <Table
        dataSource={shifts}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20 }}
        size="middle"
        locale={{ emptyText: <EmptyState title="Chưa có ca làm việc nào" /> }}
      />

      <Modal
        title="Mở ca mới"
        open={openModal}
        onOk={handleOpen}
        onCancel={() => setOpenModal(false)}
        okText="Mở ca"
        cancelText="Hủy"
      >
        <Form form={openForm} layout="vertical">
          <Form.Item
            name="cashier_name"
            label="Tên nhân viên"
            rules={[{ required: true, message: 'Nhập tên nhân viên' }]}
          >
            <Input placeholder="VD: Lan, Hoa, Minh..." />
          </Form.Item>
          <Form.Item name="opening_cash" label="Tiền đầu ca (VNĐ)" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} formatter={inputNumberFormatter} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Đóng ca"
        open={closeModal}
        onOk={handleClose}
        onCancel={() => setCloseModal(false)}
        okText="Đóng ca"
        cancelText="Hủy"
      >
        <Form form={closeForm} layout="vertical">
          <Form.Item
            name="closing_cash"
            label="Tiền mặt thực tế cuối ca (VNĐ)"
            rules={[{ required: true, message: 'Nhập số tiền' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} formatter={inputNumberFormatter} />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
