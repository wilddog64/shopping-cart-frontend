import { Link } from 'react-router-dom'
import { ArrowRight, ShoppingBag, Truck, Shield } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function HomePage() {
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
          Welcome to <span className="text-primary-600">ShopCart</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
          Discover amazing products at great prices. Shop with confidence with our secure checkout
          and fast delivery.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link to="/products">
            <Button size="lg">
              Browse Products
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="grid gap-8 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
            <ShoppingBag className="h-6 w-6 text-primary-600" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Wide Selection</h3>
          <p className="mt-2 text-gray-600">
            Browse thousands of products across multiple categories.
          </p>
        </div>
        <div className="rounded-lg border bg-white p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
            <Truck className="h-6 w-6 text-primary-600" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Fast Delivery</h3>
          <p className="mt-2 text-gray-600">Get your orders delivered quickly and reliably.</p>
        </div>
        <div className="rounded-lg border bg-white p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
            <Shield className="h-6 w-6 text-primary-600" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Secure Shopping</h3>
          <p className="mt-2 text-gray-600">Shop with confidence with our secure payment system.</p>
        </div>
      </section>
    </div>
  )
}
