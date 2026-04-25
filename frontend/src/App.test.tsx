import { render, screen } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

import { AuthProvider } from './contexts/AuthProvider';
import LoginPage from './pages/LoginPage';

// Mock API calls
jest.mock('./services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

test('renders login page', () => {
  render(
    <ConfigProvider locale={viVN}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <LoginPage />
        </MemoryRouter>
      </AuthProvider>
    </ConfigProvider>
  );

  // Kiểm tra có nút đăng nhập
  const loginButton = screen.getByText(/đăng nhập/i);
  expect(loginButton).toBeInTheDocument();
});
