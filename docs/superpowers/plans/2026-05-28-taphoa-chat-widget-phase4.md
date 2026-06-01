# Taphoa Chat Widget — Phase 4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Task 3 follows TDD; tasks 1, 2, 4-7 are config/UI/manual verify steps. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Nhúng chat agent (Phase 1-3) vào app taphoa dưới dạng bong bóng nổi 💬 (FloatButton AntD) — chat hỏi-đáp + upload ảnh hóa đơn ngay trong app, hiện trên mọi trang, không phải mở URL riêng.

**Architecture:** Vite dev server làm proxy `/agent → http://localhost:2024` (cùng origin → không CORS). Widget gắn vào `AppLayout`, dùng `useStream` từ `@langchain/langgraph-sdk/react` để quản streaming + threadId. Tái dùng nguyên agent backend (Phase 1-3) — không sửa graph/tools. Ảnh được convert sang block `{type:"image", mimeType, data}` rồi gửi qua `submit()`; agent `normalize.ts` (Phase 3) đã sẵn sàng map về dạng Gemini đọc được.

**Tech Stack:** React 19 + Vite 8 + TypeScript + Ant Design 6, `@langchain/langgraph-sdk` (useStream), `react-markdown` + `remark-gfm`, vitest (test), agent LangGraph.js `:2024` (không sửa).

**Spec gốc:** `docs/superpowers/specs/2026-05-27-taphoa-chat-widget-design.md`

> **Phase này KHÔNG bao gồm:** deploy agent production (caveat mục 9 spec), lịch sử nhiều đoạn chat, giọng nói, tinh chỉnh prompt agent, bỏ UI riêng `chat-taphoa.bangth.org`.

---

## Bối cảnh đã verify

- `frontend/package.json`: chưa có `@langchain/langgraph-sdk` lẫn lib markdown nào → cần thêm cả 3 (`@langchain/langgraph-sdk`, `react-markdown`, `remark-gfm`).
- `frontend/vite.config.ts`: đang có proxy `/api → :8082`; cần thêm `/agent → :2024` với `rewrite` bỏ tiền tố vì server LangGraph không biết `/agent`.
- `frontend/src/components/AppLayout.tsx:421`: là component bao mọi route — đặt `<ChatWidget />` ở đây sẽ hiện ở mọi trang.
- `chat-ui/src/lib/multimodal-utils.ts`: tham chiếu — đã verify format ảnh UI gửi cho agent là `{type:"image", mimeType, data, metadata}`, base64 đã bỏ prefix `data:...;base64,`. Phase 3 agent `normalize.ts` đã xử lý đầu vào dạng này.
- `chat-ui/src/providers/Stream.tsx:8,31,84,95`: tham chiếu — `useStream` từ `@langchain/langgraph-sdk/react`, dùng kèm `useQueryState` để giữ threadId trong URL; ta sẽ thay bằng `localStorage` để giữ qua nhiều trang React Router.
- `frontend/src/App.test.tsx`: dùng `jest.mock` cũ nhưng `package.json` đã chuyển vitest → bài test mới phải viết theo cú pháp vitest (`vi.mock`, không phải `jest.mock`).
- Agent local chạy `:2024` (langgraph dev), graph name = `agent` (xem `agent/langgraph.json`). Không auth ở local.

---

## File Structure

```
frontend/
├── package.json                            # MODIFY: thêm 3 deps (Task 1)
├── vite.config.ts                          # MODIFY: thêm proxy /agent (Task 2)
└── src/
    ├── lib/
    │   ├── chatImage.ts                    # NEW: fileToImageBlock (Task 3)
    │   └── chatImage.test.ts               # NEW: unit test (Task 3)
    └── components/
        ├── AppLayout.tsx                   # MODIFY: gắn <ChatWidget/> (Task 7)
        └── chat/
            ├── ChatMessage.tsx             # NEW: render 1 tin nhắn (Task 4)
            ├── ChatInput.tsx               # NEW: ô nhập + nút 📎 + send (Task 5)
            └── ChatWidget.tsx              # NEW: FloatButton + panel + useStream (Task 6)
```

---

## Task 1: Cài dependencies

**Files:**
- Modify: `frontend/package.json` (qua npm)

> **Vì sao:** Cần SDK của LangGraph để dùng `useStream` (hook quản streaming + thread). `react-markdown` + `remark-gfm` để render câu trả lời có bảng / gạch đầu dòng (agent Phase 1 prompt khuyên trả lời markdown).

- [ ] **Step 1.1: Cài 3 package**

```bash
cd frontend && npm install @langchain/langgraph-sdk react-markdown remark-gfm
```

Expected: `package.json` xuất hiện 3 dòng mới trong `dependencies`. `npm install` không lỗi.

- [ ] **Step 1.2: Verify import được**

```bash
cd frontend && npx tsc --noEmit
```
Expected: PASS (không lỗi type).

- [ ] **Step 1.3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore: add chat widget deps (langgraph-sdk, react-markdown)"
```

---

## Task 2: Thêm Vite proxy `/agent → :2024`

**Files:**
- Modify: `frontend/vite.config.ts`

> **Vì sao:** Browser cần gọi cùng origin để khỏi CORS. Vite dev server proxy `/agent/*` về `http://localhost:2024/*`. Phải `rewrite` bỏ `/agent` vì server LangGraph nhận đường gốc (`/threads`, `/runs`...), không biết prefix.

- [ ] **Step 2.1: Sửa `frontend/vite.config.ts`**

Tìm block `server.proxy` và thêm entry `/agent`:

```ts
  server: {
    port: 3000,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
      '/agent': {
        target: 'http://localhost:2024',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/agent/, ''),
      },
    },
  },
```

- [ ] **Step 2.2: Verify proxy (cần agent đang chạy)**

Mở 2 terminal:
```bash
# T1: bật agent
cd agent && pnpm dev
# T2: bật frontend
cd frontend && npm start
# T3: test proxy
curl -s http://localhost:3000/agent/info | head -c 200
```
Expected: trả về JSON info của LangGraph (có field `flags` hoặc `assistants`). Nếu trả HTML index → proxy chưa hoạt động, kiểm tra lại config.

> Nếu chưa muốn bật agent ngay, có thể skip 2.2 và verify ở Task 8.

- [ ] **Step 2.3: Commit**

```bash
git add frontend/vite.config.ts
git commit -m "feat(frontend): proxy /agent to langgraph dev server"
```

---

## Task 3: `lib/chatImage.ts` — convert File → image block (TDD)

**Files:**
- Test: `frontend/src/lib/chatImage.test.ts`
- Create: `frontend/src/lib/chatImage.ts`

> **Vì sao:** Hàm thuần, dễ test, tách khỏi React. Output trùng format `multimodal-utils.ts` của agent-chat-ui (`{type:"image", mimeType, data}`, base64 đã strip prefix `data:...;base64,`) để agent `normalize.ts` đã xử lý xong. Có giới hạn kích thước 10MB (mục 8 spec).

- [ ] **Step 3.1: Viết test thất bại** — `frontend/src/lib/chatImage.test.ts`

```ts
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
    // tạo Blob giả vượt 10MB bằng cách mock size
    const big = new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], 'big.png', { type: 'image/png' });
    await expect(fileToImageBlock(big)).rejects.toThrow(/quá lớn|too large/i);
  });
});
```

- [ ] **Step 3.2: Chạy test, verify FAIL**

```bash
cd frontend && npx vitest run src/lib/chatImage.test.ts
```
Expected: FAIL — `Cannot find module './chatImage'`.

- [ ] **Step 3.3: Viết implementation** — `frontend/src/lib/chatImage.ts`

```ts
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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // result dạng "data:image/png;base64,iVBORw..." → bỏ phần trước dấu phẩy
      const idx = result.indexOf(',');
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Đọc file thất bại'));
    reader.readAsDataURL(file);
  });
}
```

- [ ] **Step 3.4: Chạy test, verify PASS**

```bash
cd frontend && npx vitest run src/lib/chatImage.test.ts
```
Expected: tất cả 4 test PASS.

- [ ] **Step 3.5: Commit**

```bash
git add frontend/src/lib/chatImage.ts frontend/src/lib/chatImage.test.ts
git commit -m "feat(frontend): add chatImage helper to encode image blocks"
```

---

## Task 4: `ChatMessage.tsx` — render 1 tin nhắn

**Files:**
- Create: `frontend/src/components/chat/ChatMessage.tsx`

> **Vì sao:** Tách view logic. Assistant message render markdown (bảng/list). Bỏ qua tool call/tool result (mục 6 spec: "ẩn tool"). User message có thể có ảnh kèm — hiện thumbnail.

- [ ] **Step 4.1: Tạo file** — `frontend/src/components/chat/ChatMessage.tsx`

```tsx
import { UserOutlined, RobotOutlined } from '@ant-design/icons';
import { Avatar, Space, Typography } from 'antd';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Type khớp với @langchain/langgraph-sdk message — định nghĩa lỏng để không phụ thuộc nội bộ SDK
export interface ChatMessageData {
  id?: string;
  type: 'human' | 'ai' | 'tool' | 'system';
  content: string | Array<{ type: string; text?: string; mimeType?: string; data?: string }>;
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

function extractImages(content: ChatMessageData['content']): Array<{ mime: string; data: string }> {
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
            style={{ maxWidth: 240, borderRadius: 8, marginBottom: text ? 8 : 0, display: 'block' }}
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
```

- [ ] **Step 4.2: Verify type-check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: PASS.

- [ ] **Step 4.3: Commit**

```bash
git add frontend/src/components/chat/ChatMessage.tsx
git commit -m "feat(frontend): add ChatMessage with markdown + image preview"
```

---

## Task 5: `ChatInput.tsx` — ô nhập + đính ảnh + send

**Files:**
- Create: `frontend/src/components/chat/ChatInput.tsx`

> **Vì sao:** Tách hành vi nhập liệu. Hiện thumbnail ảnh đã chọn (kèm nút xóa), Enter để gửi (Shift+Enter xuống dòng). Disable nút Send khi đang chờ trả lời (`isLoading`).

- [ ] **Step 5.1: Tạo file** — `frontend/src/components/chat/ChatInput.tsx`

```tsx
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
```

- [ ] **Step 5.2: Verify type-check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: PASS.

- [ ] **Step 5.3: Commit**

```bash
git add frontend/src/components/chat/ChatInput.tsx
git commit -m "feat(frontend): add ChatInput with image picker"
```

---

## Task 6: `ChatWidget.tsx` — FloatButton + panel + useStream

**Files:**
- Create: `frontend/src/components/chat/ChatWidget.tsx`

> **Vì sao:** Thành phần "chính". `useStream` quản streaming + threadId; ta lưu threadId vào `localStorage` để giữ hội thoại khi chuyển trang. Panel ~380x560, đóng/mở bằng FloatButton 💬. Nút "Chat mới" reset thread.

- [ ] **Step 6.1: Tạo file** — `frontend/src/components/chat/ChatWidget.tsx`

```tsx
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
    const content: Array<{ type: string; text?: string; mimeType?: string; data?: string; metadata?: { name: string } }> = [];
    if (text) content.push({ type: 'text', text });
    for (const img of images) {
      content.push({ type: 'image', mimeType: img.mimeType, data: img.data, metadata: img.metadata });
    }
    stream.submit({
      messages: [{ type: 'human', content: images.length > 0 ? content : text } as ChatMessageData],
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
                <Button size="small" type="text" icon={<ReloadOutlined />} onClick={handleNewChat} />
              </Tooltip>
              <Button size="small" type="text" icon={<CloseOutlined />} onClick={() => setOpen(false)} />
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
            body: { flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' },
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
```

- [ ] **Step 6.2: Verify type-check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: PASS. Nếu báo lỗi type của `useStream` (signature `onThreadId`/`messagesKey` đổi tùy version SDK), đối chiếu `chat-ui/src/providers/Stream.tsx` để chỉnh.

- [ ] **Step 6.3: Commit**

```bash
git add frontend/src/components/chat/ChatWidget.tsx
git commit -m "feat(frontend): add ChatWidget with floating bubble + useStream"
```

---

## Task 7: Gắn `<ChatWidget />` vào `AppLayout`

**Files:**
- Modify: `frontend/src/components/AppLayout.tsx`

> **Vì sao:** `AppLayout` bọc mọi route protected → đặt widget ở đây là cách rẻ nhất để widget hiện trên mọi trang.

- [ ] **Step 7.1: Thêm import**

Trong `frontend/src/components/AppLayout.tsx`, sau dòng `import ErrorBoundary from './ErrorBoundary';`:

```ts
import ChatWidget from './chat/ChatWidget';
```

- [ ] **Step 7.2: Render widget trước thẻ `</Layout>` cuối cùng**

Tìm dòng cuối `</Modal>` (trước `</Layout>`) và thêm `<ChatWidget />`:

```tsx
      </Modal>

      <ChatWidget />
    </Layout>
  );
}
```

- [ ] **Step 7.3: Verify type-check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: PASS.

- [ ] **Step 7.4: Commit**

```bash
git add frontend/src/components/AppLayout.tsx
git commit -m "feat(frontend): mount ChatWidget in AppLayout"
```

---

## Task 8: Smoke test end-to-end (manual)

**Files:** không sửa code — chỉ verify.

> **Vì sao:** Có cách nào bug ngầm: proxy không qua, `useStream` config sai (assistantId/messagesKey), ảnh không tới Gemini... Phải mở app thật để check. (Spec mục 10.)

- [ ] **Step 8.1: Bật 3 thứ**

```bash
# T1: backend taphoa
cd backend && go run main.go
# T2: agent langgraph dev
cd agent && pnpm dev
# T3: frontend
cd frontend && npm start
```

- [ ] **Step 8.2: Test bong bóng & chat chữ**

1. Mở `http://localhost:3000`, đăng nhập như bình thường.
2. Vào trang Sản phẩm → thấy bong bóng 💬 góc phải-dưới.
3. Bấm bong bóng → panel mở (~380×560).
4. Hỏi: "tồn kho sản phẩm nào dưới 5?"
5. ✅ Câu trả lời hiện dần (streaming), bảng/list markdown render đẹp.
6. ❌ Không thấy JSON `tool_call`/`tool_result` lộ ra.

- [ ] **Step 8.3: Test giữ hội thoại khi chuyển trang**

1. Đang trong panel → chuyển sang trang Bán hàng (qua menu).
2. ✅ Bong bóng vẫn hiện, bấm vào → các tin nhắn cũ vẫn còn.
3. Bấm nút 🔄 "Chat mới" → tin nhắn biến mất, threadId mới được tạo ở lần submit tới.

- [ ] **Step 8.4: Test upload ảnh hóa đơn**

1. Bấm 📎 → chọn 1 ảnh hóa đơn JPG (vd `docs/...invoice.jpg` nếu có, hoặc bất kỳ ảnh JPG <10MB).
2. Thấy thumbnail trong khung nhập.
3. Gõ "ghi nháp giúp" hoặc để trống → bấm Send.
4. ✅ Agent trích xuất + tóm tắt nháp (giống Phase 2 CLI).

- [ ] **Step 8.5: Test lỗi khi agent offline**

1. Tắt `langgraph dev`.
2. Gửi tin nhắn → ✅ thấy Alert đỏ "Trợ lý đang bận, thử lại sau".
3. App taphoa vẫn dùng được (không crash).

- [ ] **Step 8.6: Test qua tunnel (tùy chọn — nếu tunnel đang chạy)**

1. Bật tunnel `taphoa.bangth.org` → :3000.
2. Mở trên điện thoại → bong bóng vẫn hoạt động (vì proxy nằm ở Vite dev server sau tunnel).
3. ✅ Hỏi tồn kho + chụp ảnh hóa đơn từ camera điện thoại đều chạy.

- [ ] **Step 8.7: Ghi nhận tình trạng**

Cập nhật `docs/superpowers/specs/2026-05-27-taphoa-chat-widget-design.md` chuyển trạng thái: `Draft → Implemented (v1)`. Note bất kỳ deviation nào (nếu phải đổi tham số `useStream` so với plan).

---

## Self-Review checklist (đối chiếu spec mục 2 — Phạm vi v1 LÀM)

| Yêu cầu spec | Task |
|---|---|
| Bong bóng `FloatButton` 💬 góc phải-dưới mọi trang | Task 6 + 7 |
| Panel chat ~380×560 với markdown | Task 4 + 6 |
| Chat streaming (hiện chữ dần) | Task 6 (`useStream`) |
| Upload ảnh hóa đơn → record draft | Task 3 + 5 + 6 (đi qua `normalize.ts` Phase 3) |
| Ẩn tool calls | Task 4 (`ChatMessage` chỉ render `human`/`ai`) |
| Giữ threadId qua trang + nút "Chat mới" | Task 6 (localStorage `taphoa_chat_thread`) |
| Vite proxy `/agent → :2024` cùng origin | Task 2 |
| `@langchain/langgraph-sdk` + markdown lib | Task 1 |
| Lỗi friendly khi agent offline | Task 6 (Alert + `onError`) |
| Giới hạn ảnh 10MB | Task 3 (`MAX_IMAGE_BYTES`) |
| Unit test `fileToImageBlock` | Task 3 |
| Smoke test tay (local + tunnel + điện thoại) | Task 8 |
