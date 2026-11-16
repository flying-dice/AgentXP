/** A little scene for stories: what an agent might draw when asked for "a house". */
export const houseScene: { type: string; [k: string]: unknown }[] = [
  { type: 'clear', color: '#cfeaff' },
  { type: 'rect', x: 0, y: 380, w: 800, h: 220, color: '#3f9a3f', fill: '#5fb85f', width: 1 },
  { type: 'ellipse', x: 600, y: 40, w: 100, h: 100, color: '#e0a800', fill: '#ffd94a', width: 2 },
  { type: 'rect', x: 200, y: 250, w: 280, h: 190, color: '#6b3d1f', fill: '#e8c27a', width: 3 },
  { type: 'path', points: [{ x: 180, y: 250 }, { x: 340, y: 140 }, { x: 500, y: 250 }], color: '#7a1f1f', fill: '#c0392b', width: 3, closed: true },
  { type: 'rect', x: 310, y: 330, w: 60, h: 110, color: '#4a2a12', fill: '#8a5a2b', width: 3 },
  { type: 'rect', x: 230, y: 285, w: 55, h: 50, color: '#27456b', fill: '#9fd3ff', width: 3 },
  { type: 'rect', x: 395, y: 285, w: 55, h: 50, color: '#27456b', fill: '#9fd3ff', width: 3 },
  { type: 'text', x: 250, y: 470, text: 'Hello from Agent7', font: '36px sans-serif', color: '#1e3287' }
]
