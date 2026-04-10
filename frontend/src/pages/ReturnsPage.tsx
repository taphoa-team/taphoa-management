import React, { useEffect, useState, useCallback } from 'react';
import { Table, Tag, Button, Modal, InputNumber, Input, message, Space, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import api from '../services/api';
import { Return, Invoice, InvoiceItem } from '../types';
import { formatVND, formatDateTime, getErrorMessage } from '../utils/format';
import { PageHeader, EmptyState } from '../components/common';

export default function ReturnsPage() {
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  // Create return state
  const [modalOpen, setModalOpen] = useState(false);
  const [invoiceId, setInvoiceId] = useState('');
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [fetchingInvoice, setFetchingInvoice] = useState(false);
  const [returnQtys, setReturnQtys] = useState<Record<number, number>>({});
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchReturns = useCallback(() => {
    setLoading(true);
    api.get('/returns', { params: { page, limit: 20 } })
      .then((res) => setReturns(res.data || []))
      .catch(() => message.error('Lỗi tải dữ liệu'))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { fetchReturns(); }, [fetchReturns]);

  // Tìm đơn hàng gốc
  const fetchInvoice = async () => {
    if (!invoiceId) return;
    setFetchingInvoice(true);
    try {
      const res = await api.get(`/invoices/${invoiceId}`);
      if (res.data.status === 'cancelled') {
        message.error('Đơn hàng đã bị hủy');
        setInvoice(null);
      } else {
        setInvoice(res.data);
        setReturnQtys({});
      }
    } catch {
      message.error('Không tìm thấy đơn hàng');
      setInvoice(null);
    } finally {
      setFetchingInvoice(false);
    }
  };

  // Submit trả hàng
  const handleSubmit = async () => {
    if (!invoice || !reason.trim()) {
      message.warning('Nhập lý do trả hàng');
      return;
    }

    const items = (invoice.items || [])
      .filter((item) => (returnQtys[item.id] || 0) > 0)
      .map((item) => ({
        product_id: item.product_id,
        batch_id: item.batch_id,
        quantity: returnQtys[item.id],
        refund_price: item.price,
      }));

    if (items.length === 0) {
      message.warning('Chọn ít nhất 1 sản phẩm để trả');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/returns', {
        invoice_id: invoice.id,
        reason: reason.trim(),
        items,
      });
      message.success('Đã tạo phiếu trả hàng');
      setModalOpen(false);
      setInvoice(null);
      setInvoiceId('');
      setReason('');
      setReturnQtys({});
      fetchReturns();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, 'Lỗi tạo phiếu trả'));
    } finally {
      setSubmitting(false);
    }
  };

  const totalRefund = invoice
    ? (invoice.items || []).reduce((sum, item) => sum + item.price * (returnQtys[item.id] || 0), 0)
    : 0;

  const columns = [
    { title: '#', dataIndex: 'id', width: 60 },
    { title: 'Đơn gốc', dataIndex: 'invoice_id', width: 80, render: (v: number) => `#${v}` },
    { title: 'NV', dataIndex: ['user', 'name'], width: 120 },
    { title: 'Lý do', dataIndex: 'reason', ellipsis: true },
    { title: 'Hoàn tiền', dataIndex: 'total_refund', render: formatVND, align: 'right' as const, width: 130 },
    { title: 'TT', dataIndex: 'status', width: 100, render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: 'Ngày', dataIndex: 'created_at', render: (v: string) => formatDateTime(v), width: 160 },
  ];

  return (
    <div>
      <PageHeader
        title="Trả hàng"
        actionText="Tạo phiếu trả"
        actionIcon={<PlusOutlined />}
        onAction={() => setModalOpen(true)}
      />

      <Table dataSource={returns} columns={columns} rowKey="id" loading={loading}
        pagination={{ current: page, pageSize: 20, onChange: setPage, showSizeChanger: false }} size="middle"
        locale={{ emptyText: <EmptyState title="Chưa có phiếu trả hàng nào" /> }} />

      <Modal
        title="Tạo phiếu trả hàng"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setInvoice(null); setInvoiceId(''); }}
        onOk={handleSubmit}
        okText="Xác nhận trả hàng"
        confirmLoading={submitting}
        width={700}
      >
        {/* Tìm đơn gốc */}
        <Space style={{ marginBottom: 16 }}>
          <Input
            placeholder="Nhập mã đơn hàng"
            value={invoiceId}
            onChange={(e) => setInvoiceId(e.target.value)}
            onPressEnter={fetchInvoice}
            style={{ width: 200 }}
          />
          <Button onClick={fetchInvoice} loading={fetchingInvoice}>Tìm đơn</Button>
        </Space>

        {invoice && (
          <>
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              Đơn #{invoice.id} — {formatVND(invoice.final_total)} — {formatDateTime(invoice.created_at)}
            </Typography.Text>

            <Table
              dataSource={invoice.items || []}
              rowKey="id"
              size="small"
              pagination={false}
              columns={[
                { title: 'Sản phẩm', dataIndex: ['product', 'name'], ellipsis: true },
                { title: 'Đã mua', dataIndex: 'quantity', width: 80, align: 'right' },
                { title: 'Giá', dataIndex: 'price', width: 100, align: 'right', render: formatVND },
                {
                  title: 'SL trả',
                  width: 100,
                  render: (_: any, record: InvoiceItem) => (
                    <InputNumber
                      min={0}
                      max={record.quantity}
                      value={returnQtys[record.id] || 0}
                      onChange={(v) => setReturnQtys({ ...returnQtys, [record.id]: v || 0 })}
                      size="small"
                      style={{ width: 70 }}
                    />
                  ),
                },
              ]}
            />

            <Input.TextArea
              placeholder="Lý do trả hàng (bắt buộc)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              style={{ marginTop: 12 }}
            />

            {totalRefund > 0 && (
              <Typography.Title level={5} style={{ marginTop: 12, textAlign: 'right' }}>
                Hoàn tiền: {formatVND(totalRefund)}
              </Typography.Title>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
