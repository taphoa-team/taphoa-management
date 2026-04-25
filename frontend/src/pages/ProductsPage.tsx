import {
  PlusOutlined,
  EditOutlined,
  StopOutlined,
  SearchOutlined,
  PrinterOutlined,
  DeleteOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  message,
  Space,
  Tag,
  Divider,
  Popconfirm,
} from 'antd';
import JsBarcode from 'jsbarcode';
import React, { useEffect, useState } from 'react';

import { PageHeader, EmptyState } from '../components/common';
import { PAGE_SIZE, DEBOUNCE_DELAY } from '../constants';
import { useAuth } from '../contexts/useAuth';
import {
  useProducts,
  useCategories,
  useCreateCategory,
  usePriceHistory,
  useProductConversions,
  useCreateProduct,
  useUpdateProduct,
  useDeactivateProduct,
  useCreateConversion,
  useDeleteConversion,
} from '../hooks';
import type { ProductWithStock, UnitConversion } from '../types';
import {
  formatVND,
  escapeHtml,
  inputNumberFormatter,
  formatDateTime,
  getErrorMessage,
} from '../utils/format';

export default function ProductsPage() {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProductWithStock | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryForm] = Form.useForm();
  const [form] = Form.useForm();
  const [priceHistoryOpen, setPriceHistoryOpen] = useState(false);
  const [priceHistoryProductId, setPriceHistoryProductId] = useState(0);
  const [priceHistoryProduct, setPriceHistoryProduct] = useState<string>('');
  const [convForm] = Form.useForm();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, DEBOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ─── React Query hooks ──────────────────────────────────────────────────────

  const { data: products = [], isLoading: loading } = useProducts({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    category_id: categoryFilter || undefined,
  });

  const { data: categories = [] } = useCategories();

  const createCategoryMutation = useCreateCategory();
  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const deactivateProductMutation = useDeactivateProduct();
  const createConversionMutation = useCreateConversion();
  const deleteConversionMutation = useDeleteConversion();

  const { data: priceHistory = [], isLoading: priceHistoryLoading } =
    usePriceHistory(priceHistoryProductId);

  const { data: conversions = [] } = useProductConversions(editing?.id || 0);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleCreateCategory = async () => {
    if (createCategoryMutation.isPending) return;
    const values = await categoryForm.validateFields();
    try {
      const res = await createCategoryMutation.mutateAsync(values);
      message.success('Đã tạo nhóm hàng');
      setCategoryModalOpen(false);
      categoryForm.resetFields();
      // Auto select new category
      form.setFieldsValue({ category_id: res.data.id });
    } catch (err: unknown) {
      message.error(getErrorMessage(err, 'Lỗi tạo nhóm hàng'));
    }
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ has_expiry: true });
    setModalOpen(true);
  };

  const openEdit = (p: ProductWithStock) => {
    setEditing(p);
    form.setFieldsValue({
      name: p.name,
      category_id: p.category_id,
      sell_price: p.sell_price,
      min_quantity: p.min_quantity,
      has_expiry: p.has_expiry,
      unit: p.unit,
      barcode: p.barcode,
    });
    setModalOpen(true);
  };

  const isSaving = createProductMutation.isPending || updateProductMutation.isPending;

  const handleSubmit = async () => {
    if (isSaving) return;
    const values = await form.validateFields();
    try {
      if (editing) {
        await updateProductMutation.mutateAsync({ id: editing.id, data: values });
        message.success('Đã cập nhật');
      } else {
        await createProductMutation.mutateAsync(values);
        message.success('Đã thêm sản phẩm');
      }
      setModalOpen(false);
    } catch (err: unknown) {
      console.error('Error saving product:', err);
      message.error(getErrorMessage(err, 'Lỗi lưu sản phẩm'));
    }
  };

  const handleDeactivate = async (id: number) => {
    try {
      await deactivateProductMutation.mutateAsync(id);
      message.success('Đã ngừng bán');
    } catch (err: unknown) {
      console.error('Error deactivating product:', err);
      message.error(getErrorMessage(err, 'Lỗi ngừng bán sản phẩm'));
    }
  };

  const handleShowPriceHistory = (productId: number, productName: string) => {
    setPriceHistoryProductId(productId);
    setPriceHistoryProduct(productName);
    setPriceHistoryOpen(true);
  };

  const addConversion = async () => {
    if (!editing) return;
    try {
      const values = await convForm.validateFields();
      await createConversionMutation.mutateAsync({ productId: editing.id, data: values });
      convForm.resetFields();
      message.success('Đã thêm quy đổi');
    } catch (err: unknown) {
      console.error('Error adding conversion:', err);
      message.error(getErrorMessage(err, 'Lỗi thêm quy đổi'));
    }
  };

  const handleDeleteConversion = async (productId: number, convId: number) => {
    try {
      await deleteConversionMutation.mutateAsync({ productId, conversionId: convId });
      message.success('Đã xóa quy đổi');
    } catch (err: unknown) {
      console.error('Error deleting conversion:', err);
      message.error(getErrorMessage(err, 'Lỗi xóa quy đổi'));
    }
  };

  // --- In tem ---
  const generateBarcodeSvg = (code: string) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    try {
      JsBarcode(svg, code, {
        format: 'CODE128',
        width: 1.5,
        height: 30,
        displayValue: true,
        fontSize: 10,
        margin: 0,
        font: 'monospace',
      });
      return svg.outerHTML;
    } catch {
      return `<div style="font-family:monospace;font-size:12px;letter-spacing:2px">${escapeHtml(code)}</div>`;
    }
  };

  const printBarcode = (product: ProductWithStock) => {
    const barcodeValue = product.barcode || product.sku;
    const barcodeSvg = generateBarcodeSvg(barcodeValue);

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      return;
    }

    const html = `
      <html><head><title>Tem ${escapeHtml(product.sku)}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: 50mm 30mm; margin: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; }
        .label {
          width: 50mm;
          height: 30mm;
          padding: 2mm 3mm;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
        }
        .store-name {
          font-size: 8px;
          font-weight: 700;
          color: #0d9488;
          text-transform: uppercase;
          letter-spacing: 1.5px;
        }
        .product-name {
          font-size: 9px;
          font-weight: 500;
          text-align: center;
          line-height: 1.2;
          max-height: 2.4em;
          overflow: hidden;
          width: 100%;
        }
        .barcode-area {
          display: flex;
          justify-content: center;
        }
        .barcode-area svg { max-width: 44mm; }
        .price {
          font-size: 14px;
          font-weight: 800;
          letter-spacing: -0.3px;
        }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style></head><body>
        <div class="label">
          <div class="store-name">Family Mart</div>
          <div class="product-name">${escapeHtml(product.name)}</div>
          <div class="barcode-area">${barcodeSvg}</div>
          <div class="price">${formatVND(product.sell_price)}</div>
        </div>
      </body></html>
    `;

    doc.open();
    doc.write(html);
    doc.close();

    let printed = false;
    const doPrint = () => {
      if (printed) return;
      printed = true;
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    };
    iframe.onload = doPrint;
    setTimeout(doPrint, 500);
  };

  const columns = [
    { title: 'SKU', dataIndex: 'sku', width: 100 },
    { title: 'Tên sản phẩm', dataIndex: 'name', ellipsis: true },
    {
      title: 'Nhóm',
      dataIndex: ['category', 'name'],
      width: 120,
    },
    {
      title: 'Giá bán',
      dataIndex: 'sell_price',
      width: 150,
      render: (v: number, record: ProductWithStock) => (
        <Space>
          <span>{formatVND(v)}</span>
          <Button
            type="text"
            size="small"
            icon={<HistoryOutlined />}
            onClick={e => {
              e.stopPropagation();
              handleShowPriceHistory(record.id, record.name);
            }}
            style={{ color: '#94a3b8' }}
          />
        </Space>
      ),
      align: 'right' as const,
    },
    { title: 'ĐVT', dataIndex: 'unit', width: 80 },
    {
      title: 'Tồn kho',
      dataIndex: 'stock',
      width: 100,
      align: 'right' as const,
      render: (stock: number, record: ProductWithStock) => {
        const color = stock === 0 ? 'red' : stock <= record.min_quantity ? 'orange' : 'green';
        return <Tag color={color}>{stock}</Tag>;
      },
    },
    {
      title: 'Thao tác',
      width: 240,
      render: (_: unknown, record: ProductWithStock) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(record)}>
            Sửa
          </Button>
          <Button icon={<PrinterOutlined />} size="small" onClick={() => printBarcode(record)}>
            Tem
          </Button>
          {user?.role === 'admin' && (
            <Popconfirm
              title="Ngừng bán sản phẩm?"
              description={`Bạn có chắc muốn ngừng bán "${record.name}"?`}
              onConfirm={() => handleDeactivate(record.id)}
              okText="Ngừng"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button icon={<StopOutlined />} size="small" danger>
                Ngừng
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
        title="Sản phẩm"
        actionText="Thêm SP"
        actionIcon={<PlusOutlined />}
        onAction={openCreate}
      />

      <Space style={{ marginBottom: 16 }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Tìm tên, SKU, barcode..."
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          allowClear
          style={{ width: 280 }}
        />
        <Select
          placeholder="Lọc nhóm hàng"
          value={categoryFilter}
          onChange={v => {
            setCategoryFilter(v);
            setPage(1);
          }}
          allowClear
          style={{ width: 180 }}
          options={categories.map(c => ({ value: c.id, label: c.name }))}
        />
      </Space>

      <Table
        dataSource={products}
        columns={columns}
        rowKey="id"
        loading={loading}
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
              title="Chưa có sản phẩm nào"
              description="Bắt đầu bằng cách thêm sản phẩm đầu tiên"
              actionText="Thêm sản phẩm"
              onAction={openCreate}
              showAction
            />
          ),
        }}
      />

      <Modal
        title={editing ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        okText={editing ? 'Cập nhật' : 'Thêm'}
        cancelText="Hủy"
        width={600}
        confirmLoading={isSaving}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Tên sản phẩm"
            rules={[{ required: true, message: 'Nhập tên' }]}
          >
            <Input placeholder="VD: Mì Hảo Hảo" />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="category_id"
              label="Nhóm hàng"
              rules={[{ required: true, message: 'Chọn nhóm' }]}
            >
              <Select
                placeholder="Chọn nhóm"
                options={categories.map(c => ({ value: c.id, label: c.name }))}
                dropdownRender={menu => (
                  <>
                    {menu}
                    <Divider style={{ margin: '8px 0' }} />
                    <Button
                      type="link"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        categoryForm.resetFields();
                        setCategoryModalOpen(true);
                      }}
                      style={{ width: '100%', justifyContent: 'flex-start' }}
                    >
                      Tạo nhóm hàng mới
                    </Button>
                  </>
                )}
              />
            </Form.Item>
            <Form.Item
              name="unit"
              label="Đơn vị tính"
              rules={[{ required: true, message: 'Nhập ĐVT' }]}
            >
              <Input placeholder="VD: gói, lon, kg" />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="sell_price"
              label="Giá bán (VNĐ)"
              rules={[{ required: true, message: 'Nhập giá' }]}
            >
              <InputNumber min={1} style={{ width: '100%' }} formatter={inputNumberFormatter} />
            </Form.Item>
            <Form.Item name="min_quantity" label="Tồn kho tối thiểu">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="barcode" label="Barcode">
              <Input placeholder="Quét hoặc nhập mã vạch" />
            </Form.Item>
            <Form.Item name="has_expiry" label="Có hạn sử dụng" valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>

          {/* Quy đổi đơn vị — chỉ hiện khi sửa */}
          {editing && (
            <>
              <Divider>Quy đổi đơn vị</Divider>
              {conversions.length > 0 && (
                <Table
                  dataSource={conversions}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  style={{ marginBottom: 12 }}
                  columns={[
                    { title: 'Từ', dataIndex: 'from_unit', width: 100 },
                    { title: '→', width: 30, render: () => '=' },
                    { title: 'Số lượng', dataIndex: 'conversion_rate', width: 80, align: 'right' },
                    { title: 'Đơn vị nhỏ', dataIndex: 'to_unit', width: 100 },
                    {
                      title: '',
                      width: 50,
                      render: (_: unknown, record: UnitConversion) => (
                        <Popconfirm
                          title="Xóa quy đổi này?"
                          onConfirm={() => handleDeleteConversion(editing.id, record.id)}
                        >
                          <Button size="small" icon={<DeleteOutlined />} danger type="text" />
                        </Popconfirm>
                      ),
                    },
                  ]}
                />
              )}
              <Form
                form={convForm}
                layout="inline"
                style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'flex-start' }}
              >
                <Form.Item
                  name="from_unit"
                  rules={[{ required: true, message: 'Nhập' }]}
                  style={{ marginBottom: 0, flex: 1 }}
                >
                  <Input placeholder="thùng" style={{ width: '100%' }} />
                </Form.Item>
                <span style={{ lineHeight: '32px', flexShrink: 0 }}>=</span>
                <Form.Item
                  name="conversion_rate"
                  rules={[{ required: true, message: 'Nhập' }]}
                  style={{ marginBottom: 0, width: 80 }}
                >
                  <InputNumber min={1} placeholder="24" style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item
                  name="to_unit"
                  rules={[{ required: true, message: 'Nhập' }]}
                  style={{ marginBottom: 0, flex: 1 }}
                >
                  <Input placeholder="chai" style={{ width: '100%' }} />
                </Form.Item>
                <Button icon={<PlusOutlined />} onClick={addConversion} style={{ flexShrink: 0 }}>
                  Thêm
                </Button>
              </Form>
            </>
          )}
        </Form>
      </Modal>

      {/* Modal tạo nhóm hàng nhanh */}
      <Modal
        title="Tạo nhóm hàng mới"
        open={categoryModalOpen}
        onOk={handleCreateCategory}
        onCancel={() => setCategoryModalOpen(false)}
        okText="Tạo"
        cancelText="Hủy"
        confirmLoading={createCategoryMutation.isPending}
      >
        <Form form={categoryForm} layout="vertical">
          <Form.Item
            name="name"
            label="Tên nhóm hàng"
            rules={[{ required: true, message: 'Nhập tên nhóm' }]}
          >
            <Input placeholder="VD: Đồ uống, Bánh kẹo..." />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} placeholder="Mô tả nhóm hàng (tùy chọn)" />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={`Lịch sử giá — ${priceHistoryProduct}`}
        open={priceHistoryOpen}
        onCancel={() => setPriceHistoryOpen(false)}
        footer={null}
        width={600}
      >
        <Table
          dataSource={priceHistory}
          rowKey="id"
          loading={priceHistoryLoading}
          pagination={false}
          size="small"
          locale={{ emptyText: 'Chưa có lịch sử thay đổi giá' }}
          columns={[
            {
              title: 'Thời gian',
              dataIndex: 'created_at',
              width: 160,
              render: (v: string) => formatDateTime(v),
            },
            {
              title: 'Giá cũ',
              dataIndex: 'old_price',
              width: 120,
              align: 'right' as const,
              render: (v: number) => <span style={{ color: '#ef4444' }}>{formatVND(v)}</span>,
            },
            {
              title: 'Giá mới',
              dataIndex: 'new_price',
              width: 120,
              align: 'right' as const,
              render: (v: number) => <span style={{ color: '#22c55e' }}>{formatVND(v)}</span>,
            },
            {
              title: 'Người sửa',
              dataIndex: ['user', 'name'],
              width: 120,
            },
          ]}
        />
      </Modal>
    </div>
  );
}
