/**
 * Chuyển File ảnh user chọn thành block multimodal mà agent (Phase 1-3) nhận.
 * Output trùng format agent-chat-ui (chat-ui/src/lib/multimodal-utils.ts).
 * Agent normalize.ts sẽ map tiếp về image_url data-URI cho Gemini.
 */

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB

const SUPPORTED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

export interface ImageBlock {
  type: 'image';
  mimeType: string;
  data: string; // base64, KHÔNG có prefix data:...;base64,
  metadata?: { name: string };
}

export async function fileToImageBlock(file: File): Promise<ImageBlock> {
  if (!SUPPORTED_MIME.has(file.type)) {
    throw new Error(`Định dạng ảnh không hỗ trợ: ${file.type}`);
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(`Ảnh quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB), tối đa 10MB`);
  }
  const data = await fileToBase64(file);
  return {
    type: 'image',
    mimeType: file.type,
    data,
    metadata: { name: file.name },
  };
}

async function fileToBase64(file: File): Promise<string> {
  // Dùng arrayBuffer + btoa thay vì FileReader để chạy được cả browser lẫn Node test.
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  // Build chuỗi binary 1 byte/char rồi btoa — đơn giản, đủ nhanh cho ảnh ≤10MB.
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
