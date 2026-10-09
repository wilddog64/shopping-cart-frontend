import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export const CALLBACK_TIMEOUT_MS = 15000

export default function LoginCallback() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [timedOut, setTimedOut] = useState(false)

  const params = new URLSearchParams(window.location.search)
  const hasAuthResponse = params.has('code') || params.has('error')

  useEffect(() => {
    if (auth.isAuthenticated) {
      // Get the return URL from state, or default to home
      const returnTo = (auth.user?.state as { returnTo?: string })?.returnTo || '/'
      navigate(returnTo, { replace: true })
    }
  }, [auth.isAuthenticated, auth.user?.state, navigate])

  useEffect(() => {
    if (!hasAuthResponse && !auth.isLoading && !auth.isAuthenticated && !auth.error) {
      navigate('/', { replace: true })
    }
  }, [hasAuthResponse, auth.isLoading, auth.isAuthenticated, auth.error, navigate])

  useEffect(() => {
    if (auth.isAuthenticated || auth.error) {
      return
    }
    const timer = window.setTimeout(() => setTimedOut(true), CALLBACK_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [auth.isAuthenticated, auth.error])

  if (auth.error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-red-600">Authentication error: {auth.error.message}</p>
        <button onClick={() => navigate('/')} className="text-primary-600 hover:underline">
          Return to Home
        </button>
      </div>
    )
  }

  if (timedOut && !auth.isAuthenticated) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-gray-700">Login took too long. The sign-in service may be restarting.</p>
        <div className="flex gap-4">
          <button onClick={() => void auth.signinRedirect()} className="text-primary-600 hover:underline">
            Try again
          </button>
          <button onClick={() => navigate('/')} className="text-primary-600 hover:underline">
            Return to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-64 flex-col items-center justify-center gap-4">
      <LoadingSpinner size="lg" />
      <p className="text-gray-600">Completing login...</p>
    </div>
  )
}
