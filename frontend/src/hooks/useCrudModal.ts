import { useState, useCallback } from 'react';
import { Form } from 'antd';
import type { FormInstance } from 'antd/es/form';

interface UseCrudModalOptions<T> {
  initialValues?: Partial<T>;
  onOpen?: (record: T | null) => void;
  onClose?: () => void;
}

interface UseCrudModalReturn<T> {
  // Modal state
  modalOpen: boolean;
  editing: T | null;
  isEditing: boolean;
  
  // Form instance (optional - có thể truyền từ ngoài hoặc tự tạo)
  form: FormInstance;
  
  // Actions
  openCreate: (initialData?: Partial<T>) => void;
  openEdit: (record: T) => void;
  closeModal: () => void;
  
  // Form helpers
  getInitialValues: () => Partial<T> | undefined;
}

/**
 * Hook để quản lý trạng thái Modal CRUD (Create/Read/Update/Delete)
 * Tách biệt logic modal khỏi component chính
 * 
 * @example
 * const { modalOpen, editing, isEditing, form, openCreate, openEdit, closeModal } = useCrudModal<Product>();
 * 
 * // Trong JSX:
 * <Modal open={modalOpen} onCancel={closeModal} title={isEditing ? 'Sửa' : 'Thêm'}>
 *   <Form form={form}>...</Form>
 * </Modal>
 */
export function useCrudModal<T extends Record<string, any>>(
  options: UseCrudModalOptions<T> = {}
): UseCrudModalReturn<T> {
  const { onOpen, onClose } = options;
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [form] = Form.useForm();

  const isEditing = !!editing;

  const openCreate = useCallback((initialData?: Partial<T>) => {
    setEditing(null);
    form.resetFields();
    if (initialData) {
      form.setFieldsValue(initialData);
    }
    setModalOpen(true);
    onOpen?.(null);
  }, [form, onOpen]);

  const openEdit = useCallback((record: T) => {
    setEditing(record);
    form.resetFields();
    form.setFieldsValue(record);
    setModalOpen(true);
    onOpen?.(record);
  }, [form, onOpen]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditing(null);
    form.resetFields();
    onClose?.();
  }, [form, onClose]);

  const getInitialValues = useCallback(() => {
    return editing || undefined;
  }, [editing]);

  return {
    modalOpen,
    editing,
    isEditing,
    form,
    openCreate,
    openEdit,
    closeModal,
    getInitialValues,
  };
}

export default useCrudModal;
