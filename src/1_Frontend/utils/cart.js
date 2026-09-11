const normalize = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')

export function getProductCartKey(product) {
  if (!product) return null
  if (product.cartKey) return String(product.cartKey)

  const id = normalize(product.id)
  if (id) return `id:${id}`

  const barcode = normalize(product.barcode)
  if (barcode) return `barcode:${barcode}`

  const name = normalize(product.productName || product.name)
  const tamilName = normalize(product.tamilName)
  if (!name && !tamilName) return null

  return `name:${name}|tamil:${tamilName}`
}

export function addOrIncrementCart(previousCart, product) {
  const productKey = getProductCartKey(product)
  const existingIndex = productKey
    ? previousCart.findIndex((item) => getProductCartKey(item) === productKey)
    : -1

  if (existingIndex >= 0) {
    return previousCart.map((item, index) => (
      index === existingIndex
        ? { ...item, quantity: (item.quantity || 1) + 1 }
        : item
    ))
  }

  const nextItem = { ...product, quantity: product.quantity || 1 }
  if (productKey) nextItem.cartKey = productKey
  return [...previousCart, nextItem]
}
