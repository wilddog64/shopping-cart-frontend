import { type ReactNode } from 'react'
import { useAuth } from 'react-oidc-context'
import { useLocation } from 'react-router-dom'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRoles?: string[]
}

export default function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const auth = useAuth()
  const location = useLocation()

  if (auth.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!auth.isAuthenticated) {
    // Redirect to login, preserving the intended destination
    auth.signinRedirect({ state: { returnTo: location.pathname } })
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Check for required roles if specified
  if (requiredRoles && requiredRoles.length > 0) {
    const userRoles = getUserRoles(auth.user)
    const hasRequiredRole = requiredRoles.some((role) => userRoles.includes(role))

    if (!hasRequiredRole) {
      return (
        <div className="flex h-64 flex-col items-center justify-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      )
    }
  }

  return <>{children}</>
}

function getUserRoles(user: ReturnType<typeof useAuth>['user']): string[] {
  if (!user?.profile) return []

  const roles: string[] = []

  // Extract roles from realm_access
  const realmAccess = user.profile.realm_access as { roles?: string[] } | undefined
  if (realmAccess?.roles) {
    roles.push(...realmAccess.roles)
  }

  // Extract roles from resource_access
  const resourceAccess = user.profile.resource_access as
    | Record<string, { roles?: string[] }>
    | undefined
  if (resourceAccess) {
    Object.values(resourceAccess).forEach((access) => {
      if (access.roles) {
        roles.push(...access.roles)
      }
    })
  }

  // Extract roles from groups
  const groups = user.profile.groups as string[] | undefined
  if (groups) {
    roles.push(...groups)
  }

  return roles
}
