export async function generateOgImage(brand) {
  const response = await fetch('/api/generate-og', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brand })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Generation failed')
  }

  return response.json()
}

export async function loadBrandExample() {
  const response = await fetch('/api/brand-example')
  if (!response.ok) {
    throw new Error('Failed to load example')
  }
  return response.json()
}
