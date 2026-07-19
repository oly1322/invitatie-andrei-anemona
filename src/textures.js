// Procedural canvas textures — paper grain, gold lining, the invitation card face.
import * as THREE from 'three'

function speckle(cx, w, h, count, alpha) {
  for (let i = 0; i < count; i++) {
    const shade = Math.random() < 0.5 ? '60, 48, 24' : '255, 252, 240'
    cx.fillStyle = `rgba(${shade}, ${Math.random() * alpha})`
    cx.fillRect(Math.random() * w, Math.random() * h, 1, 1)
  }
}

function fibers(cx, w, h, count) {
  cx.strokeStyle = 'rgba(120, 100, 60, 0.045)'
  cx.lineWidth = 0.6
  for (let i = 0; i < count; i++) {
    const x = Math.random() * w
    const y = Math.random() * h
    const a = Math.random() * Math.PI
    const l = 6 + Math.random() * 18
    cx.beginPath()
    cx.moveTo(x, y)
    cx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l)
    cx.stroke()
  }
}

function blotches(cx, w, h, count) {
  for (let i = 0; i < count; i++) {
    const x = Math.random() * w
    const y = Math.random() * h
    const r = 20 + Math.random() * 90
    const g = cx.createRadialGradient(x, y, 0, x, y, r)
    const warm = Math.random() < 0.5
    g.addColorStop(0, warm ? 'rgba(150, 118, 58, 0.016)' : 'rgba(255, 250, 235, 0.04)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    cx.fillStyle = g
    cx.beginPath()
    cx.arc(x, y, r, 0, Math.PI * 2)
    cx.fill()
  }
}

function edgeVignette(cx, w, h, strength = 0.05, layers = 30) {
  for (let i = 0; i < layers; i++) {
    cx.strokeStyle = `rgba(100, 76, 34, ${strength * (1 - i / layers)})`
    cx.lineWidth = 2
    cx.strokeRect(i * 1.5, i * 1.5, w - 3 * i, h - 3 * i)
  }
}

// Non-repeating panel texture — one tile maps to the whole envelope face,
// so it can carry believable large-scale paper shading without wrap seams.
export function makeEnvelopePanelTexture() {
  const W = 1024
  const H = 1365
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const cx = c.getContext('2d')
  cx.fillStyle = '#f2e7c9'
  cx.fillRect(0, 0, W, H)
  // soft top-light across the sheet
  const rg = cx.createRadialGradient(W / 2, H * 0.36, W * 0.15, W / 2, H * 0.5, H * 0.85)
  rg.addColorStop(0, 'rgba(255, 251, 238, 0.4)')
  rg.addColorStop(1, 'rgba(128, 100, 46, 0.14)')
  cx.fillStyle = rg
  cx.fillRect(0, 0, W, H)
  blotches(cx, W, H, 60)
  speckle(cx, W, H, 26000, 0.09)
  fibers(cx, W, H, 850)
  edgeVignette(cx, W, H, 0.045)
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

// Flap texture with shading that follows the die-cut V edge.
export function makeFlapTexture(EW, FLAP_LEN) {
  const W = 1024
  const H = Math.round((W * FLAP_LEN) / EW)
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const cx = c.getContext('2d')
  cx.fillStyle = '#f4e9cd'
  cx.fillRect(0, 0, W, H)
  const rg = cx.createRadialGradient(W / 2, 0, W * 0.1, W / 2, H * 0.4, H * 1.1)
  rg.addColorStop(0, 'rgba(255, 251, 238, 0.42)')
  rg.addColorStop(1, 'rgba(128, 100, 46, 0.15)')
  cx.fillStyle = rg
  cx.fillRect(0, 0, W, H)
  blotches(cx, W, H, 34)
  speckle(cx, W, H, 15000, 0.09)
  fibers(cx, W, H, 470)
  // shade along the V edge (world → px: x∈[-EW/2,EW/2] → [0,W], y∈[0,-FLAP_LEN] → [0,H])
  const px = (x) => ((x / EW) + 0.5) * W
  const py = (y) => (-y / FLAP_LEN) * H
  const hw = EW / 2
  const path = () => {
    cx.beginPath()
    cx.moveTo(px(-hw), py(0))
    cx.lineTo(px(-hw), py(0))
    cx.moveTo(px(hw), py(0))
    cx.quadraticCurveTo(px(hw * 0.8), py(-FLAP_LEN * 0.58), px(0.18), py(-FLAP_LEN + 0.12))
    cx.quadraticCurveTo(px(0), py(-FLAP_LEN - 0.04), px(-0.18), py(-FLAP_LEN + 0.12))
    cx.quadraticCurveTo(px(-hw * 0.8), py(-FLAP_LEN * 0.58), px(-hw), py(0))
  }
  for (let i = 0; i < 7; i++) {
    path()
    cx.strokeStyle = `rgba(104, 78, 34, ${0.05 * (1 - i / 7)})`
    cx.lineWidth = 8 + i * 9
    cx.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

export function makePaperTexture(base = '#f6eeda') {
  const S = 512
  const c = document.createElement('canvas')
  c.width = c.height = S
  const cx = c.getContext('2d')
  // flat base so the tile wraps seamlessly (a gradient would show repeat seams)
  cx.fillStyle = base
  cx.fillRect(0, 0, S, S)
  speckle(cx, S, S, 9000, 0.06)
  fibers(cx, S, S, 260)
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(0.55, 0.55)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function makeLiningTexture() {
  const S = 512
  const c = document.createElement('canvas')
  c.width = c.height = S
  const cx = c.getContext('2d')
  cx.fillStyle = '#e6d4ac'
  cx.fillRect(0, 0, S, S)
  speckle(cx, S, S, 5000, 0.05)
  // diagonal gold lattice
  cx.strokeStyle = 'rgba(150, 116, 52, 0.5)'
  cx.lineWidth = 1.4
  const step = 42
  for (let i = -S; i < S * 2; i += step) {
    cx.beginPath()
    cx.moveTo(i, 0)
    cx.lineTo(i + S, S)
    cx.stroke()
    cx.beginPath()
    cx.moveTo(i + S, 0)
    cx.lineTo(i, S)
    cx.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(1.6, 1.6)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// The physical card face — laid out to MATCH the DOM invitation card exactly.
// Positions were measured from the live DOM (normalised to a 600px-wide card)
// and multiplied by S = 1024/600, and the canvas height maps to the card's
// fold height at hand-off, so the 3D→DOM crossfade is seamless (same colour,
// same size, same positions). Keep in sync with .card in index.css / Invitation.jsx.
export function makeCardTexture() {
  const S = 1024 / 600 // 600px DOM card → 1024px canvas
  const W = 1024
  const FOLD = 600 * (4.06 / 2.98) // DOM card-plane height at hand-off (~817px)
  const H = Math.round(FOLD * S) // ~1395
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const cx = c.getContext('2d')

  // background — matches the DOM .card ivory
  const grad = cx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, '#faf6ec')
  grad.addColorStop(0.55, '#f8f3e7')
  grad.addColorStop(1, '#f3ecda')
  cx.fillStyle = grad
  cx.fillRect(0, 0, W, H)
  speckle(cx, W, H, 14000, 0.045)
  fibers(cx, W, H, 380)

  // double gold frame — DOM insets 13px / 19px
  cx.strokeStyle = 'rgba(176, 141, 70, 0.75)'
  cx.lineWidth = 2.4
  cx.strokeRect(13 * S, 13 * S, W - 26 * S, H - 26 * S)
  cx.strokeStyle = 'rgba(176, 141, 70, 0.38)'
  cx.lineWidth = 1.6
  cx.strokeRect(19 * S, 19 * S, W - 38 * S, H - 38 * S)

  const gold = '#8f6f2f'
  const ink = '#423a2c'
  const soft = '#6b604d'
  const cxW = W / 2

  cx.textAlign = 'center'
  cx.textBaseline = 'middle'

  const spaced = (fn) => {
    try { fn() } finally {
      try { cx.letterSpacing = '0px' } catch (e) { /* noop */ }
    }
  }
  const ls = (px) => {
    try { cx.letterSpacing = `${px}px` } catch (e) { /* noop */ }
  }

  // eyebrow
  cx.fillStyle = soft
  cx.font = `${13 * S}px "Cormorant Garamond"`
  spaced(() => { ls(4.2 * S); cx.fillText('ÎMPREUNĂ CU CEI DRAGI', cxW, 50.7 * S) })

  // names
  cx.font = `${64.4 * S}px "Pinyon Script"`
  cx.fillStyle = gold
  cx.fillText('Andrei & Anemona', cxW, 109.9 * S)

  // intro (same wrap as the DOM card)
  cx.font = `italic ${17.2 * S}px "Cormorant Garamond"`
  cx.fillStyle = soft
  const intro = [
    ['avem bucuria de a vă invita să ne fiți alături în', 172.6],
    ['ziua în care spunem „da”', 199.3],
  ]
  intro.forEach(([line, y]) => cx.fillText(line, cxW, y * S))

  // date
  cx.font = `600 ${31.5 * S}px Cinzel`
  cx.fillStyle = ink
  spaced(() => { ls(5.7 * S); cx.fillText('26 · IX · 2026', cxW, 259.6 * S) })
  cx.font = `italic ${16 * S}px "Cormorant Garamond"`
  cx.fillStyle = soft
  cx.fillText('sâmbătă', cxW, 294.4 * S)

  // a venue block, matching the DOM .venue element positions
  const mapLink = (y) => {
    cx.fillStyle = gold
    cx.font = `${14 * S}px "Cormorant Garamond"`
    const label = 'VEZI HARTA'
    spaced(() => {
      ls(2.4 * S)
      cx.fillText(label, cxW + 8 * S, y)
      const w = cx.measureText(label).width
      // pin dot to the left
      cx.beginPath()
      cx.arc(cxW - w / 2 - 6 * S, y, 4 * S, 0, Math.PI * 2)
      cx.stroke()
      // underline
      cx.beginPath()
      cx.moveTo(cxW + 8 * S - w / 2, y + 12 * S)
      cx.lineTo(cxW + 8 * S + w / 2, y + 12 * S)
      cx.lineWidth = 1
      cx.strokeStyle = 'rgba(176, 141, 70, 0.5)'
      cx.stroke()
    })
  }
  const venue = (label, time, place, yLabel, yTime, yPlace, yLink) => {
    cx.fillStyle = gold
    cx.font = `600 ${14 * S}px Cinzel`
    spaced(() => { ls(3.6 * S); cx.fillText(label, cxW, yLabel * S) })
    cx.fillStyle = ink
    cx.font = `italic ${17.2 * S}px "Cormorant Garamond"`
    cx.fillText(time, cxW, yTime * S)
    cx.fillStyle = soft
    cx.font = `italic ${16 * S}px "Cormorant Garamond"`
    cx.fillText(place, cxW, yPlace * S)
    cx.strokeStyle = gold
    mapLink(yLink * S)
  }
  venue('CUNUNIA RELIGIOASĂ', 'ora 16:00', 'Biserica „Grecescu” · Drobeta-Turnu Severin', 343.4, 369.1, 391.4, 418.1)
  venue('PETRECEREA', 'ora 19:00', 'Conacul Jean C. Mihail · Rogova', 459.4, 485.1, 507.4, 534.1)

  // flourish divider (DOM .divider)
  const dy = 587.1 * S
  cx.strokeStyle = 'rgba(176, 141, 70, 0.85)'
  cx.lineWidth = 1.4
  const lg = cx.createLinearGradient(cxW - 160 * S, 0, cxW - 24 * S, 0)
  lg.addColorStop(0, 'rgba(176, 141, 70, 0)')
  lg.addColorStop(1, 'rgba(176, 141, 70, 0.85)')
  cx.strokeStyle = lg
  cx.beginPath(); cx.moveTo(cxW - 160 * S, dy); cx.lineTo(cxW - 24 * S, dy); cx.stroke()
  const rg2 = cx.createLinearGradient(cxW + 24 * S, 0, cxW + 160 * S, 0)
  rg2.addColorStop(0, 'rgba(176, 141, 70, 0.85)')
  rg2.addColorStop(1, 'rgba(176, 141, 70, 0)')
  cx.strokeStyle = rg2
  cx.beginPath(); cx.moveTo(cxW + 24 * S, dy); cx.lineTo(cxW + 160 * S, dy); cx.stroke()
  cx.strokeStyle = 'rgba(176, 141, 70, 0.85)'
  cx.beginPath()
  cx.moveTo(cxW, dy - 12 * S); cx.lineTo(cxW + 7 * S, dy); cx.lineTo(cxW, dy + 12 * S); cx.lineTo(cxW - 7 * S, dy); cx.closePath()
  cx.stroke()

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

// firefly sprite — hot bright core with a warm halo
export function makeFireflySprite() {
  const S = 96
  const c = document.createElement('canvas')
  c.width = c.height = S
  const cx = c.getContext('2d')
  const g = cx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  g.addColorStop(0, 'rgba(255, 248, 224, 1)')
  g.addColorStop(0.18, 'rgba(255, 226, 158, 0.9)')
  g.addColorStop(0.45, 'rgba(224, 176, 92, 0.42)')
  g.addColorStop(1, 'rgba(210, 160, 80, 0)')
  cx.fillStyle = g
  cx.fillRect(0, 0, S, S)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// image loading + processing helpers for the generated (Higgsfield) textures
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function drawCover(cx, img, W, H, zoom = 1) {
  const s = Math.max(W / img.width, H / img.height) * zoom
  const w = img.width * s
  const h = img.height * s
  cx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h)
}

// real scanned-paper panel: generated photo + edge shading baked on top
export async function makeRealPanelTexture(src) {
  const img = await loadImage(src)
  const W = 1024
  const H = 1365
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const cx = c.getContext('2d')
  // zoom past the photo's own deckled border; lift toward off-white so the
  // gold script stays legible, keeping the crumple relief
  cx.filter = 'saturate(0.55) brightness(1.16)'
  drawCover(cx, img, W, H, 1.22)
  cx.filter = 'none'
  cx.globalCompositeOperation = 'multiply'
  cx.fillStyle = '#fbf5e8'
  cx.fillRect(0, 0, W, H)
  cx.globalCompositeOperation = 'source-over'
  const rg = cx.createRadialGradient(W / 2, H * 0.36, W * 0.15, W / 2, H * 0.5, H * 0.85)
  rg.addColorStop(0, 'rgba(255, 252, 242, 0.22)')
  rg.addColorStop(1, 'rgba(120, 95, 45, 0.1)')
  cx.fillStyle = rg
  cx.fillRect(0, 0, W, H)
  edgeVignette(cx, W, H, 0.035)
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

export async function makeRealFlapTexture(src, EW, FLAP_LEN) {
  const img = await loadImage(src)
  const W = 1024
  const H = Math.round((W * FLAP_LEN) / EW)
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const cx = c.getContext('2d')
  // sample a different region of the sheet so flap and body don't twin
  const s = Math.max(W / img.width, (H * 1.6) / img.height) * 1.22
  cx.filter = 'saturate(0.55) brightness(1.16)'
  cx.drawImage(img, (W - img.width * s) / 2, -H * 0.55, img.width * s, img.height * s)
  cx.filter = 'none'
  cx.globalCompositeOperation = 'multiply'
  cx.fillStyle = '#fcf7ec'
  cx.fillRect(0, 0, W, H)
  cx.globalCompositeOperation = 'source-over'
  const px = (x) => ((x / EW) + 0.5) * W
  const py = (y) => (-y / FLAP_LEN) * H
  const hw = EW / 2
  for (let i = 0; i < 7; i++) {
    cx.beginPath()
    cx.moveTo(px(hw), py(0))
    cx.quadraticCurveTo(px(hw * 0.8), py(-FLAP_LEN * 0.58), px(0.18), py(-FLAP_LEN + 0.12))
    cx.quadraticCurveTo(px(0), py(-FLAP_LEN - 0.04), px(-0.18), py(-FLAP_LEN + 0.12))
    cx.quadraticCurveTo(px(-hw * 0.8), py(-FLAP_LEN * 0.58), px(-hw), py(0))
    cx.strokeStyle = `rgba(104, 78, 34, ${0.05 * (1 - i / 7)})`
    cx.lineWidth = 8 + i * 9
    cx.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

export async function makeTileTexture(src, repeat = 1) {
  const img = await loadImage(src)
  const tex = new THREE.Texture(img)
  tex.needsUpdate = true
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(repeat, repeat)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

// soft round sprite for the gold dust particles
export function makeDustSprite() {
  const S = 64
  const c = document.createElement('canvas')
  c.width = c.height = S
  const cx = c.getContext('2d')
  const g = cx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  g.addColorStop(0, 'rgba(255, 230, 170, 1)')
  g.addColorStop(0.4, 'rgba(230, 190, 110, 0.55)')
  g.addColorStop(1, 'rgba(230, 190, 110, 0)')
  cx.fillStyle = g
  cx.fillRect(0, 0, S, S)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
