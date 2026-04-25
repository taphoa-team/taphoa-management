import {
  EyeInvisibleOutlined,
  EyeOutlined,
  LockOutlined,
  PhoneOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { message } from 'antd';
import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { APP_NAME } from '../constants';
import { useAuth } from '../contexts/useAuth';
import { getErrorMessage } from '../utils/format';
import './LoginPage.css';

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const validatePhone = (value: string) => {
    return /(84|0[35789])\d{8}$/.test(value);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    let valid = true;

    if (!validatePhone(phone)) {
      setPhoneError('Vui lòng nhập số điện thoại hợp lệ');
      valid = false;
    } else {
      setPhoneError('');
    }

    if (password.length < 6) {
      setPasswordError('Mật khẩu phải có ít nhất 6 ký tự');
      valid = false;
    } else {
      setPasswordError('');
    }

    if (!valid) return;

    setLoading(true);
    try {
      await login(phone, password);
      message.success('Đăng nhập thành công');
      navigate('/');
    } catch (err: unknown) {
      message.error(getErrorMessage(err, 'Đăng nhập thất bại'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg-shapes">
        <div className="login-shape login-shape-1" />
        <div className="login-shape login-shape-2" />
        <div className="login-shape login-shape-3" />
      </div>

      <div className="login-container">
        <div className="login-card">
          <div className="login-brand">
            <div className="login-logo">
              <ShopOutlined style={{ fontSize: 36, color: 'white' }} />
            </div>
            <h1 className="login-title">{APP_NAME}</h1>
            <p className="login-subtitle">Chào mừng bạn quay trở lại!</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="login-form-group" style={{ animationDelay: '0.1s' }}>
              <div className={`login-input-wrapper ${phoneError ? 'has-error' : ''}`}>
                <PhoneOutlined className="login-input-icon" />
                <input
                  type="tel"
                  className="login-input"
                  placeholder="Số điện thoại"
                  maxLength={10}
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setPhoneError('');
                  }}
                />
              </div>
              {phoneError && <div className="login-error">{phoneError}</div>}
            </div>

            <div className="login-form-group" style={{ animationDelay: '0.2s' }}>
              <div className={`login-input-wrapper ${passwordError ? 'has-error' : ''}`}>
                <LockOutlined className="login-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="login-input"
                  placeholder="Mật khẩu"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError('');
                  }}
                />
                <button
                  type="button"
                  className="login-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                </button>
              </div>
              {passwordError && <div className="login-error">{passwordError}</div>}
            </div>

            <button
              type="submit"
              className={`login-submit ${loading ? 'loading' : ''}`}
              disabled={loading}
            >
              <span className="login-btn-text">Đăng nhập</span>
              <div className="login-spinner" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
