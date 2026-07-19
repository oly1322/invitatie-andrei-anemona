import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import Envelope from './Envelope'
import { makeDustSprite, makePetalTexture, makeDoveFrames, makeRaySprite } from './textures'

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

// drifting flower petals — tumbling at several depths, catching the light
// (MeshStandard so the directional lights glint on them as they turn)
function Petals({ count = 42 }) {
  const ref = useRef()
  const petalTex = useMemo(() => makePetalTexture(), [])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const data = useMemo(() => {
    const tints = ['#f8ece4', '#f4ddd2', '#f7f0e2', '#efdcc2', '#ecccc4', '#f6e7d8']
    const arr = []
    for (let i = 0; i < count; i++) {
      arr.push({
        x: (Math.random() - 0.5) * 17,
        y: (Math.random() - 0.5) * 14,
        z: -3.5 + Math.random() * 5,
        rx: Math.random() * 6.28,
        ry: Math.random() * 6.28,
        rz: Math.random() * 6.28,
        srx: (Math.random() - 0.5) * 1.1,
        sry: (Math.random() - 0.5) * 0.9,
        srz: (Math.random() - 0.5) * 0.7,
        fall: 0.32 + Math.random() * 0.5,
        sway: 0.3 + Math.random() * 0.7,
        swAmp: 0.4 + Math.random() * 0.7,
        swph: Math.random() * 6.28,
        size: 0.16 + Math.random() * 0.22,
        tint: tints[i % tints.length],
      })
    }
    return arr
  }, [count])

  useEffect(() => {
    data.forEach((p, i) => ref.current.setColorAt(i, new THREE.Color(p.tint)))
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
  }, [data])

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    for (let i = 0; i < count; i++) {
      const p = data[i]
      p.y -= p.fall * delta
      if (p.y < -7.2) {
        p.y = 7.2
        p.x = (Math.random() - 0.5) * 17
      }
      dummy.position.set(p.x + Math.sin(t * p.sway + p.swph) * p.swAmp, p.y, p.z)
      dummy.rotation.set(p.rx + t * p.srx, p.ry + t * p.sry, p.rz + t * p.srz)
      dummy.scale.setScalar(p.size)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <planeGeometry args={[1, 1.28]} />
      <meshStandardMaterial
        map={petalTex}
        transparent
        side={THREE.DoubleSide}
        roughness={0.62}
        metalness={0}
        depthWrite={false}
        alphaTest={0.03}
      />
    </instancedMesh>
  )
}

// distant doves gliding across the far background with a gentle wing flap
const DOVE_CYCLE = [0, 1, 2, 1]
function Doves({ count = 3 }) {
  const frames = useMemo(() => makeDoveFrames(), [])
  const refs = useRef([])
  const data = useMemo(() => {
    const arr = []
    for (let i = 0; i < count; i++) {
      arr.push({
        x: (Math.random() - 0.5) * 22,
        y: 2.6 + Math.random() * 3.2,
        z: -5 - Math.random() * 2.6,
        dir: Math.random() < 0.5 ? 1 : -1,
        speed: 0.5 + Math.random() * 0.45,
        bob: 0.28 + Math.random() * 0.32,
        bobF: 0.4 + Math.random() * 0.3,
        bph: Math.random() * 6.28,
        flapF: 2.6 + Math.random() * 1.8,
        fph: Math.random() * 10,
        size: 1.0 + Math.random() * 0.7,
      })
    }
    return arr
  }, [count])

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    for (let i = 0; i < count; i++) {
      const d = data[i]
      const m = refs.current[i]
      if (!m) continue
      d.x += d.dir * d.speed * delta
      if (d.x > 13) { d.x = -13; d.y = 2.6 + Math.random() * 3.2 }
      if (d.x < -13) { d.x = 13; d.y = 2.6 + Math.random() * 3.2 }
      m.position.set(d.x, d.y + Math.sin(t * d.bobF + d.bph) * d.bob, d.z)
      m.scale.set(d.dir * d.size, d.size, 1)
      const fi = DOVE_CYCLE[Math.floor((t * d.flapF + d.fph) % 4)]
      if (m.material.map !== frames[fi]) {
        m.material.map = frames[fi]
        m.material.needsUpdate = true
      }
    }
  })

  return data.map((d, i) => (
    <mesh key={i} ref={(el) => (refs.current[i] = el)} position={[d.x, d.y, d.z]}>
      <planeGeometry args={[1.7, 1.08]} />
      <meshBasicMaterial map={frames[0]} transparent color="#8f8676" opacity={0.42} depthWrite={false} />
    </mesh>
  ))
}

// soft god-rays slanting down from above, for atmosphere and depth
function GodRays() {
  const rayTex = useMemo(() => makeRaySprite(), [])
  const group = useRef()
  useFrame((state) => {
    const t = state.clock.elapsedTime
    const kids = group.current.children
    for (let i = 0; i < kids.length; i++) {
      kids[i].material.opacity = 0.05 + 0.035 * (0.5 + 0.5 * Math.sin(t * 0.25 + i * 1.7))
    }
  })
  const rays = [
    [-3.4, -0.32, 3.4],
    [-0.6, -0.1, 2.6],
    [2.2, 0.12, 3.0],
    [4.2, 0.3, 2.2],
  ]
  return (
    <group ref={group} position={[0, 3.4, -4.2]}>
      {rays.map(([x, rot, w], i) => (
        <mesh key={i} position={[x, 0, 0]} rotation={[0, 0, rot]}>
          <planeGeometry args={[w, 15]} />
          <meshBasicMaterial
            map={rayTex}
            transparent
            opacity={0.07}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            color="#fff0c8"
          />
        </mesh>
      ))}
    </group>
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

      <GodRays />
      <Doves />
      <Petals />
      <GoldDust count={70} />

      <Envelope onBegin={onBegin} onRevealed={onRevealed} />
    </>
  )
}
