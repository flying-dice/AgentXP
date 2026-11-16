export interface PopupPosition {
  left: number
  top: number
  minWidth: number
  maxHeight: number
}

/** Fixed-position coordinates for a popup hanging below (or above, if cramped) an anchor. */
export function positionPopup(anchor: DOMRect, popupHeight: number, viewportHeight = window.innerHeight): PopupPosition {
  const below = viewportHeight - anchor.bottom - 4
  const above = anchor.top - 4
  const flip = popupHeight > below && above > below
  const maxHeight = Math.max(60, flip ? above : below)
  const height = Math.min(popupHeight, maxHeight)
  return {
    left: anchor.left,
    top: flip ? anchor.top - height + 1 : anchor.bottom - 1,
    minWidth: anchor.width,
    maxHeight
  }
}
