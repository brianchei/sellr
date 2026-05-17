// @vitest-environment jsdom
import {
  sendEmailOtp,
  sendOtp,
  setAccessToken,
  verifyEmailOtp,
  verifyOtp,
} from '@sellr/api-client';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from './page';

const routerReplaceMock = vi.fn();
const refreshSessionMock = vi.fn();
const setSessionMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: routerReplaceMock }),
}));

vi.mock('@/components/auth-provider', () => ({
  useAuth: () => ({
    communityIds: null,
    hydrated: true,
    isAuthenticated: false,
    refreshSession: refreshSessionMock,
    setSession: setSessionMock,
  }),
}));

vi.mock('@sellr/api-client', () => ({
  sendEmailOtp: vi.fn(),
  sendOtp: vi.fn(),
  setAccessToken: vi.fn(),
  verifyEmailOtp: vi.fn(),
  verifyOtp: vi.fn(),
}));

const sendEmailOtpMock = vi.mocked(sendEmailOtp);
const sendOtpMock = vi.mocked(sendOtp);
const setAccessTokenMock = vi.mocked(setAccessToken);
const verifyEmailOtpMock = vi.mocked(verifyEmailOtp);
const verifyOtpMock = vi.mocked(verifyOtp);

describe('<LoginPage /> accessibility states', () => {
  beforeEach(() => {
    routerReplaceMock.mockReset();
    refreshSessionMock.mockReset();
    setSessionMock.mockReset();
    sendEmailOtpMock.mockReset();
    sendOtpMock.mockReset();
    setAccessTokenMock.mockReset();
    verifyEmailOtpMock.mockReset();
    verifyOtpMock.mockReset();
  });

  it('ties email validation errors to the active field', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const email = screen.getByRole('textbox', { name: 'Student email' });
    await user.type(email, 'student@example.com');
    fireEvent.submit(email.closest('form')!);

    const alert = await screen.findByRole('alert');
    expect(alert.getAttribute('id')).toBe('login-error');
    expect(alert.textContent).toContain('Use your wisc.edu email');
    expect(email.getAttribute('aria-invalid')).toBe('true');
    expect(email.getAttribute('aria-describedby')).toBe(
      'login-email-help login-error',
    );
  });

  it('ties verification-code errors to the active field', async () => {
    const user = userEvent.setup();
    sendEmailOtpMock.mockResolvedValue({ sent: true });
    verifyEmailOtpMock.mockRejectedValue(new Error('Invalid or expired code'));
    render(<LoginPage />);

    await user.type(
      screen.getByRole('textbox', { name: 'Student email' }),
      'student@wisc.edu',
    );
    await user.click(screen.getByRole('button', { name: 'Send email code' }));
    const code = await screen.findByRole('textbox', {
      name: '6 digit verification code',
    });
    await user.type(code, '000000');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'Invalid or expired code',
      );
    });
    expect(code.getAttribute('aria-invalid')).toBe('true');
    expect(code.getAttribute('aria-describedby')).toBe('login-error');
  });
});
