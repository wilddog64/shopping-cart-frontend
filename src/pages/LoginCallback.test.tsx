import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@/test/test-utils'
import LoginCallback, { CALLBACK_TIMEOUT_MS } from './LoginCallback'

const { authMock, navigateMock } = vi.hoisted(() => ({
  authMock: {
    isAuthenticated: false,
    isLoading: false,
    error: null as Error | null,
    user: undefined as { state?: { returnTo?: string } } | undefined,
    signinRedirect: vi.fn(),
  },
  navigateMock: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

vi.mock('react-oidc-context', () => ({
  useAuth: () => authMock,
}))

describe('LoginCallback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(authMock, {
      isAuthenticated: false,
      isLoading: false,
      error: null,
      user: undefined,
    })
    window.history.pushState({}, '', '/callback?code=abc&state=xyz')
  })

  afterEach(() => {
    vi.useRealTimers()
    window.history.pushState({}, '', '/')
  })

  it('shows the retry UI after a never-resolving callback times out', () => {
    vi.useFakeTimers()
    authMock.isLoading = true
    render(<LoginCallback />)

    expect(screen.getByText('Completing login...')).toBeInTheDocument()
    expect(screen.queryByText('Login took too long')).not.toBeInTheDocument()

    act(() => vi.advanceTimersByTime(CALLBACK_TIMEOUT_MS))

    expect(screen.getByText('Login took too long. The sign-in service may be restarting.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(authMock.signinRedirect).toHaveBeenCalledTimes(1)
  })

  it('navigates home when the callback URL has no auth response', () => {
    window.history.pushState({}, '', '/callback')
    render(<LoginCallback />)

    expect(navigateMock).toHaveBeenCalledWith('/', { replace: true })
  })

  it('navigates to returnTo after a successful callback', () => {
    authMock.isAuthenticated = true
    authMock.user = { state: { returnTo: '/orders' } }
    render(<LoginCallback />)

    expect(navigateMock).toHaveBeenCalledWith('/orders', { replace: true })
  })

  it('shows the authentication error', () => {
    authMock.error = new Error('boom')
    render(<LoginCallback />)

    expect(screen.getByText('Authentication error: boom')).toBeInTheDocument()
  })
})
