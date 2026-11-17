/** Turns an exported SVG into a PNG (the browser draws it on a canvas) and hands a file to the user. */

/** A PNG data URL of an SVG drawing, `scale` times its size (at most 8000 px a side). */
export async function svgToPng(svg: string, width: number, height: number, scale = 2, background: string | null = '#ffffff'): Promise<string> {
  const s = Math.max(0.1, Math.min(scale, 8000 / Math.max(width, height, 1)))
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const img = new Image()
    img.decoding = 'async'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('The drawing could not be turned into a picture.'))
      img.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(width * s))
    canvas.height = Math.max(1, Math.round(height * s))
    const ctx = canvas.getContext('2d')!
    if (background) {
      ctx.fillStyle = background
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Saves a file to this computer's Downloads folder (the browser's download), like Paint's Save as PNG. */
export function download(href: string, name: string): void {
  const link = document.createElement('a')
  link.href = href
  link.download = name
  link.click()
}
