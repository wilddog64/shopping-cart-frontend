import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function LoginCallback() {
  const auth = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (auth.isAuthenticated) {
      // Get the return URL from state, or default to home
      const returnTo = (auth.user?.state as { returnTo?: string })?.returnTo || '/'
      navigate(returnTo, { replace: true })
    }
  }, [auth.isAuthenticated, auth.user?.state, navigate])

  if (auth.error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-red-600">Authentication error: {auth.error.message}</p>
        <button
          onClick={() => navigate('/')}
          className="text-primary-600 hover:underline"
        >
          Return to Home
        </button>
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
