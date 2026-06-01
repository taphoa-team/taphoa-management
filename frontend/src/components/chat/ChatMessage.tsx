import { UserOutlined, RobotOutlined } from '@ant-design/icons';
import { Avatar, Space, Typography } from 'antd';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Type khớp với @langchain/langgraph-sdk message — định nghĩa lỏng để không phụ thuộc nội bộ SDK
export interface ChatMessageData {
  id?: string;
  type: 'human' | 'ai' | 'tool' | 'system';
  content:
    | string
    | Array<{
        type: string;
        text?: string;
        mimeType?: string;
        data?: string;
      }>;
}

interface Props {
  message: ChatMessageData;
}

function extractText(content: ChatMessageData['content']): string {
  if (typeof content === 'string') return content;
  return content
    .filter((b) => b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('\n');
}

function extractImages(
  content: ChatMessageData['content'],
): Array<{ mime: string; data: string }> {
  if (typeof content === 'string') return [];
  return content
    .filter((b) => b.type === 'image' && b.data && b.mimeType)
    .map((b) => ({ mime: b.mimeType as string, data: b.data as string }));
}

export default function ChatMessage({ message }: Props) {
  // Ẩn tool call / tool result — chỉ render human + ai
  if (message.type !== 'human' && message.type !== 'ai') return null;

  const isUser = message.type === 'human';
  const text = extractText(message.content);
  const images = isUser ? extractImages(message.content) : [];

  // AI gửi rỗng (đang streaming chưa có token) → hiện "..." để biết đang chạy
  if (!text && images.length === 0) {
    return (
      <Space align="start" style={{ width: '100%', marginBottom: 12 }}>
        <Avatar icon={<RobotOutlined />} style={{ background: '#0d9488' }} />
        <Typography.Text type="secondary">đang soạn…</Typography.Text>
      </Space>
    );
  }

  return (
    <Space
      align="start"
      style={{
        width: '100%',
        marginBottom: 12,
        flexDirection: isUser ? 'row-reverse' : 'row',
        display: 'flex',
      }}
    >
      <Avatar
        icon={isUser ? <UserOutlined /> : <RobotOutlined />}
        style={{ background: isUser ? '#1677ff' : '#0d9488', flexShrink: 0 }}
      />
      <div
        style={{
          background: isUser ? '#e6f4ff' : '#f5f5f5',
          padding: '8px 12px',
          borderRadius: 12,
          maxWidth: 280,
          wordBreak: 'break-word',
        }}
      >
        {images.map((img, i) => (
          <img
            key={i}
            src={`data:${img.mime};base64,${img.data}`}
            alt="ảnh đính kèm"
            style={{
              maxWidth: 240,
              borderRadius: 8,
              marginBottom: text ? 8 : 0,
              display: 'block',
            }}
          />
        ))}
        {text && (
          <div className="chat-markdown" style={{ fontSize: 14, lineHeight: 1.5 }}>
            {isUser ? (
              <Typography.Text>{text}</Typography.Text>
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
            )}
          </div>
        )}
      </div>
    </Space>
  );
}
