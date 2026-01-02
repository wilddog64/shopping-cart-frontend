import { WebStorageStateStore } from 'oidc-client-ts'
import type { AuthProviderProps } from 'react-oidc-context'

const KEYCLOAK_URL = import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080'
const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM || 'shopping-cart'
const CLIENT_ID = import.meta.env.VITE_CLIENT_ID || 'frontend'

export const oidcConfig: AuthProviderProps = {
  authority: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`,
  client_id: CLIENT_ID,
  redirect_uri: `${window.location.origin}/callback`,
  post_logout_redirect_uri: window.location.origin,
  scope: 'openid profile email',
  userStore: new WebStorageStateStore({ store: window.localStorage }),
  onSigninCallback: () => {
    // Remove the code and state from the URL after successful login
    window.history.replaceState({}, document.title, window.location.pathname)
  },
}

export const getAccessToken = (): string | null => {
  const oidcStorage = localStorage.getItem(
    `oidc.user:${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}:${CLIENT_ID}`
  )
  if (!oidcStorage) {
    return null
  }

  try {
    const user = JSON.parse(oidcStorage)
    return user.access_token || null
  } catch {
    return null
  }
}
