import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import Envelope from './Envelope'
import { makeDustSprite, makeFireflySprite } from './textures'

function CameraRig({ phase }) {
  const { camera, size } = useThree()
  useFrame((state) => {
    // pull back on narrow screens so the envelope always fits with margin
    const aspect = size.width / size.height
    const targetZ = Math.max(8.4, 4.1 / (2 * Math.tan((40 * Math.PI) / 360) * aspect))
    // parallax eases off once the opening starts, so the card hand-off stays aligned
    const par = phase === 'sealed' ? 1 : 0
    // once opening, the camera centres to y=0 and looks straight down -z, so the
    // settle projection (a plain pinhole) is exact and the 3D card overlays the
    // DOM card with no offset/gap at the top
    const baseY = phase === 'sealed' ? 0.1 : 0
    const px = state.pointer.x * 0.45 * par
    const py = baseY + state.pointer.y * 0.25 * par
    camera.position.x += (px - camera.position.x) * 0.04
    camera.position.y += (py - camera.position.y) * 0.04
    camera.position.z += (targetZ - camera.position.z) * 0.08
    if (par > 0) camera.lookAt(0, 0, 0)
    else camera.lookAt(camera.position.x, camera.position.y, 0)
  })
  return null
}

function GoldDust({ count = 130 }) {
  const ref = useRef()
  const sprite = useMemo(() => makeDustSprite(), [])
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 12
      arr[i * 3 + 1] = (Math.random() - 0.5) * 8
      arr[i * 3 + 2] = (Math.random() - 0.5) * 5 - 1
    }
    return arr
  }, [count])
  const speeds = useMemo(() => {
    const arr = new Float32Array(count)
    for (let i = 0; i < count; i++) arr[i] = 0.05 + Math.random() * 0.14
    return arr
  }, [count])

  useFrame((state, delta) => {
    const pos = ref.current.geometry.attributes.position
    for (let i = 0; i < count; i++) {
      pos.array[i * 3 + 1] += speeds[i] * delta
      pos.array[i * 3] += Math.sin(state.clock.elapsedTime * 0.4 + i) * delta * 0.03
      if (pos.array[i * 3 + 1] > 4.2) pos.array[i * 3 + 1] = -4.2
    }
    pos.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={sprite}
        size={0.075}
        sizeAttenuation
        transparent
        opacity={0.55}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        color="#e3c37e"
      />
    </points>
  )
}

// fireflies — tiny warm lights wandering organically through the scene,
// each with its own flight path and slow breathing flicker
function Fireflies({ count = 38 }) {
  const ref = useRef()
  const sprite = useMemo(() => makeFireflySprite(), [])
  const flies = useMemo(() => {
    const arr = []
    for (let i = 0; i < count; i++) {
      arr.push({
        bx: (Math.random() - 0.5) * 16,
        by: (Math.random() - 0.5) * 10,
        bz: -1.2 - Math.random() * 5.5,
        ax: 0.6 + Math.random() * 1.4,
        ay: 0.5 + Math.random() * 1.1,
        fx: 0.05 + Math.random() * 0.14,
        fy: 0.06 + Math.random() * 0.16,
        fz: 0.04 + Math.random() * 0.1,
        p1: Math.random() * Math.PI * 2,
        p2: Math.random() * Math.PI * 2,
        p3: Math.random() * Math.PI * 2,
        ff: 0.25 + Math.random() * 0.8,
        fp: Math.random() * Math.PI * 2,
      })
    }
    return arr
  }, [count])
  const positions = useMemo(() => new Float32Array(count * 3), [count])
  const colors = useMemo(() => new Float32Array(count * 3), [count])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const pos = ref.current.geometry.attributes.position
    const col = ref.current.geometry.attributes.color
    for (let i = 0; i < count; i++) {
      const f = flies[i]
      pos.array[i * 3] =
        f.bx + Math.sin(t * f.fx + f.p1) * f.ax + Math.sin(t * 0.31 + f.p2) * 0.5
      pos.array[i * 3 + 1] =
        f.by + Math.sin(t * f.fy + f.p2) * f.ay + Math.cos(t * 0.21 + f.p3) * 0.35
      pos.array[i * 3 + 2] = f.bz + Math.sin(t * f.fz + f.p3) * 0.6
      // slow breathing glow, occasionally dimming almost out
      const breathe = 0.5 + 0.5 * Math.sin(t * f.ff + f.fp)
      const glow = 0.18 + 0.82 * breathe * breathe
      col.array[i * 3] = 1.0 * glow
      col.array[i * 3 + 1] = 0.82 * glow
      col.array[i * 3 + 2] = 0.45 * glow
    }
    pos.needsUpdate = true
    col.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={sprite}
        size={0.17}
        sizeAttenuation
        transparent
        vertexColors
        opacity={0.95}
        depthWrite={false}
      />
    </points>
  )
}

export default function Experience({ phase, onBegin, onRevealed }) {
  return (
    <>
      <CameraRig phase={phase} />

      <ambientLight intensity={0.6} color="#fff6e2" />
      <directionalLight position={[4, 6, 6]} intensity={1.35} color="#ffeecb" />
      <directionalLight position={[-5, 2, 4]} intensity={0.3} color="#f3efe2" />

      {/* studio reflections for the gold — no network fetch, pure lightformers */}
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={1.3} color="#fff4e0" position={[0, 4, 3]} scale={[8, 4, 1]} rotation-x={-Math.PI / 4} />
        <Lightformer form="rect" intensity={0.8} color="#ffe6b8" position={[5, 1, 2]} scale={[3, 6, 1]} rotation-y={-Math.PI / 4} />
        <Lightformer form="rect" intensity={0.5} color="#dfe6f5" position={[-5, 0, 2]} scale={[3, 6, 1]} rotation-y={Math.PI / 4} />
      </Environment>

      <Fireflies />
      <GoldDust />

      <Envelope onBegin={onBegin} onRevealed={onRevealed} />
    </>
  )
}
