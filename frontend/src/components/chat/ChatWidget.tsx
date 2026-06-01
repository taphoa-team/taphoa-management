import { MessageOutlined, CloseOutlined, ReloadOutlined } from '@ant-design/icons';
import { useStream } from '@langchain/langgraph-sdk/react';
import { Alert, Button, Card, FloatButton, Space, Tooltip, Typography } from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { type ImageBlock } from '../../lib/chatImage';

import ChatInput from './ChatInput';
import ChatMessage, { type ChatMessageData } from './ChatMessage';

const THREAD_STORAGE_KEY = 'taphoa_chat_thread';
const PANEL_W = 380;
const PANEL_H = 560;

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem(THREAD_STORAGE_KEY) : null,
  );
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // useStream gọi proxy /agent → langgraph dev :2024; graph "agent" (xem agent/langgraph.json)
  const stream = useStream<{ messages: ChatMessageData[] }>({
    apiUrl: '/agent',
    assistantId: 'agent',
    messagesKey: 'messages',
    threadId: threadId ?? undefined,
    onThreadId: (id) => {
      setThreadId(id);
      localStorage.setItem(THREAD_STORAGE_KEY, id);
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    },
  });

  const messages = useMemo<ChatMessageData[]>(
    () => (stream.messages as ChatMessageData[] | undefined) ?? [],
    [stream.messages],
  );

  // Auto-scroll xuống cuối khi có tin mới
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const handleSend = (text: string, images: ImageBlock[]) => {
    setError(null);
    const content: Array<{
      type: string;
      text?: string;
      mimeType?: string;
      data?: string;
      metadata?: { name: string };
    }> = [];
    if (text) content.push({ type: 'text', text });
    for (const img of images) {
      content.push({
        type: 'image',
        mimeType: img.mimeType,
        data: img.data,
        metadata: img.metadata,
      });
    }
    stream.submit({
      messages: [
        {
          type: 'human',
          content: images.length > 0 ? content : text,
        } as ChatMessageData,
      ],
    });
  };

  const handleNewChat = () => {
    localStorage.removeItem(THREAD_STORAGE_KEY);
    setThreadId(null);
    setError(null);
    // useStream tự reset khi threadId đổi sang undefined ở lần submit kế
  };

  return (
    <>
      <FloatButton
        icon={<MessageOutlined />}
        type="primary"
        tooltip="Trợ lý"
        onClick={() => setOpen((v) => !v)}
        style={{ right: 24, bottom: 24 }}
      />
      {open && (
        <Card
          size="small"
          title={
            <Space>
              <MessageOutlined />
              <Typography.Text strong>Trợ lý</Typography.Text>
            </Space>
          }
          extra={
            <Space>
              <Tooltip title="Đoạn chat mới">
                <Button
                  size="small"
                  type="text"
                  icon={<ReloadOutlined />}
                  onClick={handleNewChat}
                />
              </Tooltip>
              <Button
                size="small"
                type="text"
                icon={<CloseOutlined />}
                onClick={() => setOpen(false)}
              />
            </Space>
          }
          style={{
            position: 'fixed',
            right: 24,
            bottom: 88,
            width: PANEL_W,
            height: PANEL_H,
            zIndex: 1000,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
          }}
          styles={{
            body: {
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              overflow: 'hidden',
            },
          }}
        >
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
            {messages.length === 0 && !stream.isLoading && (
              <Typography.Text type="secondary">
                Chào! Hỏi mình về tồn kho, doanh thu, hoặc gửi ảnh hóa đơn để mình ghi nháp giúp.
              </Typography.Text>
            )}
            {messages.map((m, i) => (
              <ChatMessage key={m.id ?? i} message={m} />
            ))}
            {error && (
              <Alert
                type="error"
                showIcon
                style={{ marginTop: 8 }}
                message="Trợ lý đang bận, thử lại sau"
                description={error}
              />
            )}
          </div>
          <ChatInput isLoading={stream.isLoading} onSend={handleSend} />
        </Card>
      )}
    </>
  );
}
