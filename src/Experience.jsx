import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import Envelope from './Envelope'
import { makeDustSprite, makeRaySprite } from './textures'

const PETAL_SRCS = [
  '/textures/petals/petal1.png',
  '/textures/petals/petal2.png',
  '/textures/petals/petal3.png',
  '/textures/petals/petal4.png',
]

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

// one drift of a single petal photo, tumbling and falling at several depths
function PetalLayer({ texture, count }) {
  const ref = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const data = useMemo(() => {
    const arr = []
    for (let i = 0; i < count; i++) {
      arr.push({
        x: (Math.random() - 0.5) * 12,
        y: (Math.random() - 0.5) * 13,
        z: -3.5 + Math.random() * 5,
        rx: Math.random() * 6.28,
        ry: Math.random() * 6.28,
        rz: Math.random() * 6.28,
        srx: (Math.random() - 0.5) * 0.85,
        sry: (Math.random() - 0.5) * 0.8,
        srz: (Math.random() - 0.5) * 0.55,
        fall: 0.28 + Math.random() * 0.45,
        sway: 0.3 + Math.random() * 0.7,
        swAmp: 0.4 + Math.random() * 0.8,
        swph: Math.random() * 6.28,
        size: 0.28 + Math.random() * 0.42,
      })
    }
    return arr
  }, [count])

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    for (let i = 0; i < count; i++) {
      const p = data[i]
      p.y -= p.fall * delta
      if (p.y < -7) {
        p.y = 7
        p.x = (Math.random() - 0.5) * 12
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
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={texture}
        transparent
        alphaTest={0.32}
        side={THREE.DoubleSide}
        depthWrite={false}
        toneMapped={false}
      />
    </instancedMesh>
  )
}

// drifting real flower petals — four photographed petals, cut out, tumbling
// through the scene at several depths
function Petals({ perLayer = 9 }) {
  const textures = useTexture(PETAL_SRCS)
  useMemo(() => {
    textures.forEach((t) => {
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 4
    })
  }, [textures])
  return textures.map((tex, i) => (
    <PetalLayer key={i} texture={tex} count={perLayer} />
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
      <Petals />
      <GoldDust count={70} />

      <Envelope onBegin={onBegin} onRevealed={onRevealed} />
    </>
  )
}
