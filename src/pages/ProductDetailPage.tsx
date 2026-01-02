import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import { ArrowLeft, Minus, Plus, ShoppingCart } from 'lucide-react'
import { useProduct } from '@/hooks/useProducts'
import { useAddToCart } from '@/hooks/useCart'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { formatCurrency } from '@/utils/format'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const auth = useAuth()
  const { data: product, isLoading, error } = useProduct(id!)
  const addToCart = useAddToCart()
  const [quantity, setQuantity] = useState(1)

  const handleAddToCart = () => {
    if (!product) return

    if (!auth.isAuthenticated) {
      auth.signinRedirect()
      return
    }

    addToCart.mutate({
      productId: product.id,
      name: product.name,
      quantity,
      unitPrice: product.price,
    })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="text-center">
        <p className="text-red-600">Error loading product</p>
        <Button variant="link" onClick={() => navigate('/products')}>
          Back to products
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Product Image */}
        <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">
              No image available
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <Badge variant="secondary">{product.category}</Badge>
            <h1 className="mt-2 text-3xl font-bold">{product.name}</h1>
          </div>

          <p className="text-gray-600">{product.description}</p>

          <div className="text-3xl font-bold text-primary-600">
            {formatCurrency(product.price, product.currency)}
          </div>

          <div className="flex items-center gap-4">
            <span className="text-gray-600">Quantity:</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center text-lg font-medium">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                disabled={quantity >= product.stock}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {product.stock > 0 ? (
            <p className="text-green-600">{product.stock} items in stock</p>
          ) : (
            <p className="text-red-600">Out of stock</p>
          )}

          <Button
            size="lg"
            className="w-full"
            onClick={handleAddToCart}
            disabled={product.stock === 0 || addToCart.isPending}
            loading={addToCart.isPending}
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            Add to Cart
          </Button>

          {addToCart.isSuccess && (
            <p className="text-center text-green-600">Added to cart!</p>
          )}
          {addToCart.isError && (
            <p className="text-center text-red-600">Failed to add to cart</p>
          )}
        </div>
      </div>
    </div>
  )
}
