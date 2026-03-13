import { Link } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import { ShoppingCart, User, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useCartStore } from '@/stores/cartStore'

export default function Header() {
  const auth = useAuth()
  const itemCount = useCartStore((state) => state.itemCount)

  const handleLogin = () => {
    auth.signinRedirect()
  }

  const handleLogout = () => {
    auth.signoutRedirect()
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-white">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-primary-600">
            <ShoppingCart className="h-6 w-6" />
            <span>ShopCart</span>
          </Link>
          <nav className="hidden md:flex md:gap-6">
            <Link to="/products" className="text-gray-600 hover:text-gray-900">
              Products
            </Link>
            {auth.isAuthenticated && (
              <Link to="/orders" className="text-gray-600 hover:text-gray-900">
                Orders
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {auth.isAuthenticated && (
            <Link to="/cart" className="relative">
              <ShoppingCart className="h-6 w-6 text-gray-600 hover:text-gray-900" />
              {itemCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-xs text-white">
                  {itemCount}
                </span>
              )}
            </Link>
          )}

          {auth.isAuthenticated ? (
            <div className="flex items-center gap-4">
              <div className="hidden items-center gap-2 md:flex">
                <User className="h-5 w-5 text-gray-600" />
                <span className="text-sm text-gray-700">
                  {auth.user?.profile.name || auth.user?.profile.email}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          ) : (
            <Button onClick={handleLogin}>
              <User className="mr-2 h-4 w-4" />
              Login
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
