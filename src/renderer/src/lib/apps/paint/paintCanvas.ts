/** DOM side of Agent Paint: applying ops to a 2D context and resizing a canvas. */
import { floodFill, parseColor, type PaintOp } from './paintOps'

export const FONT = "'Segoe UI', 'Noto Sans', sans-serif"

function strokeStyle(ctx: CanvasRenderingContext2D, color: string, width: number): void {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
}

/** Draws one validated op. `fallback` is the colour used when the op names none. */
export function applyOp(ctx: CanvasRenderingContext2D, op: PaintOp, fallback: string): void {
  const { canvas } = ctx
  ctx.save()
  ctx.globalAlpha = 1
  switch (op.op) {
    case 'line':
      strokeStyle(ctx, op.color ?? fallback, op.width ?? 2)
      ctx.beginPath()
      ctx.moveTo(op.x1, op.y1)
      ctx.lineTo(op.x2, op.y2)
      ctx.stroke()
      break
    case 'rect':
      if (op.fill) {
        ctx.fillStyle = op.fill
        ctx.fillRect(op.x, op.y, op.w, op.h)
      }
      strokeStyle(ctx, op.color ?? fallback, op.width ?? 2)
      ctx.strokeRect(op.x, op.y, op.w, op.h)
      break
    case 'ellipse':
      ctx.beginPath()
      ctx.ellipse(op.x + op.w / 2, op.y + op.h / 2, Math.abs(op.w) / 2, Math.abs(op.h) / 2, 0, 0, Math.PI * 2)
      if (op.fill) {
        ctx.fillStyle = op.fill
        ctx.fill()
      }
      strokeStyle(ctx, op.color ?? fallback, op.width ?? 2)
      ctx.stroke()
      break
    case 'path':
      ctx.beginPath()
      op.points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
      if (op.closed) ctx.closePath()
      if (op.fill) {
        ctx.fillStyle = op.fill
        ctx.fill()
      }
      strokeStyle(ctx, op.color ?? fallback, op.width ?? 2)
      ctx.stroke()
      break
    case 'fill':
      fillAt(ctx, op.x, op.y, op.color)
      break
    case 'text':
      ctx.fillStyle = op.color ?? fallback
      ctx.font = op.font ?? `${op.size ?? 20}px ${FONT}`
      ctx.textBaseline = 'top'
      op.text.split('\n').forEach((line, i) => ctx.fillText(line, op.x, op.y + i * (op.size ?? 20) * 1.2))
      break
    case 'clear':
      ctx.fillStyle = op.color ?? '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      break
  }
  ctx.restore()
}

/** Flood fill with a colour string. */
export function fillAt(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  const rgba = parseColor(color)
  if (!rgba) return
  const { width, height } = ctx.canvas
  const image = ctx.getImageData(0, 0, width, height)
  if (floodFill(image.data, width, height, x, y, rgba) > 0) ctx.putImageData(image, 0, 0)
}

/** Changes the canvas size keeping the pixels; new area is white. */
export function resizeCanvas(canvas: HTMLCanvasElement, width: number, height: number): void {
  const copy = document.createElement('canvas')
  copy.width = canvas.width
  copy.height = canvas.height
  copy.getContext('2d')!.drawImage(canvas, 0, 0)
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(copy, 0, 0)
}
