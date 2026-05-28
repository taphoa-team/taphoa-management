import { PaperClipOutlined, SendOutlined, CloseOutlined } from '@ant-design/icons';
import { Button, Input, Space, Tooltip, message as antMessage } from 'antd';
import React, { useRef, useState } from 'react';

import { fileToImageBlock, type ImageBlock } from '../../lib/chatImage';

interface Props {
  isLoading: boolean;
  onSend: (text: string, images: ImageBlock[]) => void;
}

export default function ChatInput({ isLoading, onSend }: Props) {
  const [text, setText] = useState('');
  const [images, setImages] = useState<ImageBlock[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const canSend = !isLoading && (text.trim().length > 0 || images.length > 0);

  const handlePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ''; // reset input để cùng 1 ảnh chọn lại được
    for (const f of files) {
      try {
        const block = await fileToImageBlock(f);
        setImages((prev) => [...prev, block]);
      } catch (err) {
        antMessage.error(err instanceof Error ? err.message : 'Đọc ảnh thất bại');
      }
    }
  };

  const handleSend = () => {
    if (!canSend) return;
    onSend(text.trim(), images);
    setText('');
    setImages([]);
  };

  return (
    <div style={{ borderTop: '1px solid #f0f0f0', padding: 12 }}>
      {images.length > 0 && (
        <Space wrap style={{ marginBottom: 8 }}>
          {images.map((img, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <img
                src={`data:${img.mimeType};base64,${img.data}`}
                alt={img.metadata?.name ?? 'ảnh'}
                style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6 }}
              />
              <Button
                size="small"
                shape="circle"
                icon={<CloseOutlined />}
                onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                style={{ position: 'absolute', top: -6, right: -6 }}
              />
            </div>
          ))}
        </Space>
      )}
      <Space.Compact style={{ width: '100%' }}>
        <Tooltip title="Đính ảnh hóa đơn">
          <Button
            icon={<PaperClipOutlined />}
            onClick={() => fileRef.current?.click()}
            disabled={isLoading}
          />
        </Tooltip>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple
          style={{ display: 'none' }}
          onChange={handlePick}
        />
        <Input.TextArea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Hỏi gì đó hoặc đính ảnh hóa đơn…"
          autoSize={{ minRows: 1, maxRows: 4 }}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={isLoading}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          disabled={!canSend}
          loading={isLoading}
        />
      </Space.Compact>
    </div>
  );
}
