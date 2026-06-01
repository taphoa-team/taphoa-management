import { describe, it, expect } from 'vitest';

import { fileToImageBlock, MAX_IMAGE_BYTES } from './chatImage';

// helper: tạo File từ string -> Blob -> File
function makeFile(content: string, name: string, type: string): File {
  return new File([content], name, { type });
}

describe('fileToImageBlock', () => {
  it('chuyển PNG nhỏ thành block image với base64 không có prefix data:', async () => {
    const file = makeFile('hello', 'a.png', 'image/png');
    const block = await fileToImageBlock(file);
    expect(block.type).toBe('image');
    expect(block.mimeType).toBe('image/png');
    // 'hello' base64 = 'aGVsbG8='
    expect(block.data).toBe('aGVsbG8=');
    expect(block.data.startsWith('data:')).toBe(false);
    expect(block.metadata?.name).toBe('a.png');
  });

  it('chấp nhận jpeg, gif, webp', async () => {
    for (const mime of ['image/jpeg', 'image/gif', 'image/webp']) {
      const f = makeFile('x', 'x', mime);
      const b = await fileToImageBlock(f);
      expect(b.mimeType).toBe(mime);
    }
  });

  it('từ chối mime không hỗ trợ', async () => {
    const f = makeFile('x', 'x.txt', 'text/plain');
    await expect(fileToImageBlock(f)).rejects.toThrow(/không hỗ trợ/i);
  });

  it('từ chối file lớn hơn MAX_IMAGE_BYTES', async () => {
    // tạo File giả vượt 10MB
    const big = new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], 'big.png', { type: 'image/png' });
    await expect(fileToImageBlock(big)).rejects.toThrow(/quá lớn|too large/i);
  });
});
