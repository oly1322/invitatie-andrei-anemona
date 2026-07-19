import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Line } from '@react-three/drei'
import * as THREE from 'three'
import {
  makeEnvelopePanelTexture,
  makeFlapTexture,
  makeLiningTexture,
  makeCardTexture,
  makeRealPanelTexture,
  makeRealFlapTexture,
  makeTileTexture,
} from './textures'
import { playSealCrack, playPaper, startMusic } from './audio'

// envelope + card dimensions (world units)
const EW = 3.3
const EH = 4.4
const FLAP_LEN = 2.35
const CW = 2.98
const CH = 4.06
const FOV_HALF_TAN = Math.tan((40 * Math.PI) / 360)

const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)
const easeIn = (p) => p * p * p
const clamp01 = (v) => Math.min(1, Math.max(0, v))
const mix = (a, b, p) => a + (b - a) * p

function roundedRectShape(w, h, r) {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

// die-cut V flap with softly curved sides, hinge along y=0
function flapShape() {
  const s = new THREE.Shape()
  const hw = EW / 2
  s.moveTo(-hw, 0)
  s.lineTo(hw, 0)
  s.quadraticCurveTo(hw * 0.8, -FLAP_LEN * 0.58, 0.18, -FLAP_LEN + 0.12)
  s.quadraticCurveTo(0, -FLAP_LEN - 0.04, -0.18, -FLAP_LEN + 0.12)
  s.quadraticCurveTo(-hw * 0.8, -FLAP_LEN * 0.58, -hw, 0)
  return s
}

// the envelope FRONT is a pocket, not a full panel: a pentagon covering the
// body with a downward V-notch at the top. With the flap open, the card peeks
// through the notch; as the envelope slides away, the card is uncovered
// beautifully through and above that V.
const NOTCH_Y = -0.05
function pocketShape() {
  const s = new THREE.Shape()
  const hw = EW / 2
  const hh = EH / 2
  const r = 0.07
  s.moveTo(-hw + r, -hh)
  s.lineTo(hw - r, -hh)
  s.quadraticCurveTo(hw, -hh, hw, -hh + r)
  s.lineTo(hw, hh) // top-right corner
  s.lineTo(0, NOTCH_Y) // dip down to the notch point
  s.lineTo(-hw, hh) // top-left corner
  s.lineTo(-hw, -hh + r)
  s.quadraticCurveTo(-hw, -hh, -hw + r, -hh)
  return s
}

// organic wavy wax blob
function waxShape(R = 0.42) {
  const s = new THREE.Shape()
  const N = 90
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2
    const r = R * (1 + 0.06 * Math.sin(a * 7 + 1.3) + 0.03 * Math.sin(a * 3))
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r
    if (i === 0) s.moveTo(x, y)
    else s.lineTo(x, y)
  }
  return s
}

export default function Envelope({ onBegin, onRevealed }) {
  const floatRef = useRef()
  const envRef = useRef()
  const flapRef = useRef()
  const flapMountRef = useRef()
  const cardRef = useRef()
  const sealRef = useRef()

  const openStart = useRef(null)
  const sfx = useRef({ flap: false, slide: false, revealed: false })
  const [hovered, setHovered] = useState(false)
  const [opened, setOpened] = useState(false)

  const panelTex = useMemo(() => {
    const t = makeEnvelopePanelTexture()
    t.repeat.set(1 / EW, 1 / EH)
    t.offset.set(0.5, 0.5)
    return t
  }, [])
  const flapTex = useMemo(() => {
    const t = makeFlapTexture(EW, FLAP_LEN)
    t.repeat.set(1 / EW, 1 / FLAP_LEN)
    t.offset.set(0.5, 1.0)
    return t
  }, [])
  const liningTex = useMemo(() => makeLiningTexture(), [])
  const cardTex = useMemo(() => makeCardTexture(), [])

  const paperMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: panelTex,
        bumpMap: panelTex,
        bumpScale: 0.5,
        roughness: 0.95,
        metalness: 0.02,
        color: '#fffdf4',
      }),
    [panelTex]
  )
  const flapMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: flapTex,
        bumpMap: flapTex,
        bumpScale: 0.5,
        roughness: 0.95,
        metalness: 0.02,
        color: '#fffdf4',
      }),
    [flapTex]
  )
  const liningMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: liningTex,
        roughness: 0.7,
        metalness: 0.18,
      }),
    [liningTex]
  )
  // the open flap's underside — unlit so the gold lattice stays warm even
  // though its normals face away from the lights
  const liningBackMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: liningTex,
        side: THREE.BackSide,
        color: '#ddd3ba',
      }),
    [liningTex]
  )

  const swapTextures = () => {
    let on = true
    makeRealPanelTexture('/textures/paper.png').then((t) => {
      if (!on) return
      t.repeat.set(1 / EW, 1 / EH)
      t.offset.set(0.5, 0.5)
      paperMat.map = t
      paperMat.bumpMap = t
      paperMat.bumpScale = 0.7
      paperMat.needsUpdate = true
    })
    makeRealFlapTexture('/textures/paper.png', EW, FLAP_LEN).then((t) => {
      if (!on) return
      t.repeat.set(1 / EW, 1 / FLAP_LEN)
      t.offset.set(0.5, 1.0)
      flapMat.map = t
      flapMat.bumpMap = t
      flapMat.bumpScale = 0.7
      flapMat.needsUpdate = true
    })
    makeTileTexture('/textures/wax.png', 1).then((t) => {
      if (!on) return
      waxMat.map = t
      waxMat.bumpMap = t
      waxMat.bumpScale = 0.25
      waxMat.color.set('#ffffff')
      waxMat.roughness = 0.35
      waxMat.needsUpdate = true
    })
    makeTileTexture('/textures/lining.png', 1.2).then((t) => {
      if (!on) return
      liningMat.map = t
      liningMat.needsUpdate = true
      liningBackMat.map = t
      liningBackMat.needsUpdate = true
    })
    return () => {
      on = false
    }
  }

  // burgundy sealing wax
  const waxMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#7d1f2c',
        metalness: 0.12,
        roughness: 0.42,
        envMapIntensity: 0.6,
        transparent: true,
      }),
    []
  )
  const waxDarkMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#5c141f',
        metalness: 0.15,
        roughness: 0.4,
        envMapIntensity: 0.6,
        transparent: true,
      }),
    []
  )
  // unlit, so the 3D card shows the texture's true ivory — matching the flat
  // DOM RSVP card exactly, with no warm tint from the scene lights
  const cardMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: cardTex,
        transparent: true,
        toneMapped: false,
      }),
    [cardTex]
  )

  // swap in the generated (photo-real) textures once they're processed —
  // declared after every material it touches
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(swapTextures, [])

  const panelGeo = useMemo(
    () =>
      new THREE.ExtrudeGeometry(roundedRectShape(EW, EH, 0.07), {
        depth: 0.022,
        bevelEnabled: false,
      }),
    []
  )
  const pocketGeo = useMemo(() => new THREE.ShapeGeometry(pocketShape()), [])
  const flapGeo = useMemo(() => new THREE.ShapeGeometry(flapShape()), [])
  // subtle inner-mouth shadow tracing the notch edges, for depth
  const notchOutline = useMemo(
    () => [
      [EW / 2, EH / 2, 0],
      [0, NOTCH_Y, 0],
      [-EW / 2, EH / 2, 0],
    ],
    []
  )
  const flapOutline = useMemo(
    () => flapShape().getPoints(80).map((p) => [p.x, p.y, 0]),
    []
  )
  // the bottom-flap crease of the pocket: two diagonals from the lower corners
  // up to the notch point, completing the folded-paper diamond with the V-notch
  const seamMeet = [0, NOTCH_Y, 0.0315]
  const seams = useMemo(
    () => [
      [[-EW / 2 + 0.05, -EH / 2 + 0.06, 0.0315], seamMeet],
      [[EW / 2 - 0.05, -EH / 2 + 0.06, 0.0315], seamMeet],
    ],
    []
  )
  const waxGeo = useMemo(
    () =>
      new THREE.ExtrudeGeometry(waxShape(), {
        depth: 0.045,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.025,
        bevelSegments: 3,
      }),
    []
  )

  const sealClick = () => {
    if (openStart.current !== null) return
    setOpened(true)
    document.body.style.cursor = 'auto'
    playSealCrack()
    startMusic()
    onBegin?.()
    openStart.current = -1 // armed; stamped with clock time next frame
  }

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const o =
      openStart.current !== null && openStart.current !== -1
        ? t - openStart.current
        : 0

    // the idle float calms down while the card takes center stage,
    // so the 3D card can line up exactly with the DOM card
    const calm = clamp01((o - 1.7) / 0.8)
    const amp = 1 - easeInOut(calm)
    if (floatRef.current) {
      floatRef.current.rotation.y = Math.sin(t * 0.35) * 0.05 * amp
      floatRef.current.rotation.x = Math.sin(t * 0.27) * 0.02 * amp
      floatRef.current.position.y = Math.sin(t * 0.6) * 0.05 * amp
    }

    // seal hover affordance
    if (sealRef.current && openStart.current === null) {
      const target = hovered ? 1.06 : 1
      const s = sealRef.current.scale.x + (target - sealRef.current.scale.x) * 0.12
      sealRef.current.scale.setScalar(s)
    }

    if (openStart.current === null) return
    if (openStart.current === -1) {
      openStart.current = t
      return
    }

    // 1 — the wax seal pops off and tumbles away
    if (sealRef.current) {
      const f = Math.max(0, o - 0.1)
      if (f > 0) {
        sealRef.current.position.y = 0.08 - 4.2 * f * f
        sealRef.current.position.z = 0.2 + f * 0.9
        sealRef.current.rotation.x = -f * 3.2
        const fade = clamp01(1 - f / 0.85)
        waxMat.opacity = fade
        waxDarkMat.opacity = fade
        sealRef.current.visible = f < 0.9
      }
    }

    // 2 — the flap folds all the way open (a full 180°) AND translates backward,
    // so it lies flat BEHIND the envelope — completely out of the card's way,
    // exactly like fully folding an envelope open in real life.
    const pFlap = clamp01((o - 0.55) / 1.3)
    if (pFlap > 0 && !sfx.current.flap) {
      sfx.current.flap = true
      playPaper(1.0, 0.28)
    }
    const eFlap = easeInOut(pFlap)
    if (flapRef.current) flapRef.current.rotation.x = -0.045 - (Math.PI - 0.045) * eFlap
    if (flapMountRef.current) flapMountRef.current.position.z = 0.06 - 0.24 * eFlap

    // 3 — the WHOLE envelope slides straight down and away, uncovering the
    // invitation, which stays exactly where it is. Like drawing the sleeve off a
    // card: the envelope descends past it and the invitation is revealed in place.
    const pSlide = clamp01((o - 1.9) / 1.8)
    if (pSlide > 0 && !sfx.current.slide) {
      sfx.current.slide = true
      playPaper(1.5, 0.34)
    }
    if (envRef.current) {
      envRef.current.position.y = -8 * easeInOut(pSlide)
    }

    // 4 — the card holds still while it's uncovered, then eases to reading size
    // at the exact spot the live DOM card will occupy, for a seamless hand-off
    const pCenter = clamp01((o - 3.4) / 1.4)
    const eC = easeInOut(pCenter)
    if (cardRef.current) {
      const cam = state.camera
      const W = state.size.width
      const H = state.size.height
      const aspect = W / H
      // distance where the card's world width spans the DOM card's pixel width
      const fw = Math.min(600, W * 0.94) / W
      const d = CW / (2 * FOV_HALF_TAN * aspect * fw)
      const zc = cam.position.z - d
      // vertical placement: card top at the DOM card-wrap's top padding
      const padT = Math.min(Math.max(H * 0.04, 18), 56)
      const fTop = 1 - (2 * padT) / H
      const cy = cam.position.y + fTop * d * FOV_HALF_TAN - CH / 2

      cardRef.current.position.y = mix(-0.05, cy, eC)
      cardRef.current.position.z = mix(-0.005, zc, eC)

      // only after the DOM card is fully opaque on top does the 3D card retire —
      // the guest never sees the switch
      cardMat.opacity = 1 - clamp01((o - 5.6) / 0.4)
      cardRef.current.visible = cardMat.opacity > 0.001
    }

    // reveal the live card only once this one has completely settled
    if (o > 5.05 && !sfx.current.revealed) {
      sfx.current.revealed = true
      onRevealed?.()
    }
  })

  return (
    <group ref={floatRef}>
      {/* the card — sibling of the envelope so it can stay while the envelope exits */}
      <group ref={cardRef} position={[0, -0.05, -0.005]}>
        <mesh material={cardMat}>
          <planeGeometry args={[CW, CH]} />
        </mesh>
      </group>

      <group ref={envRef}>
        {/* back panel */}
        <mesh geometry={panelGeo} position={[0, 0, -0.077]} material={paperMat} />

        {/* gold lining just inside the back panel */}
        <mesh position={[0, 0, -0.045]}>
          <planeGeometry args={[EW - 0.12, EH - 0.12]} />
          <primitive object={liningMat} attach="material" />
        </mesh>

        {/* front POCKET with the V-notch — the card hides behind it (peeking
            through the notch once the flap opens) and is uncovered beautifully
            as the whole envelope slides away downward */}
        <mesh geometry={pocketGeo} position={[0, 0, 0.03]} material={paperMat} />

        {/* inner-mouth shadow along the notch edges, for depth */}
        <Line
          points={notchOutline}
          color="#5a4a2a"
          transparent
          opacity={0.28}
          lineWidth={2}
          position={[0, 0, 0.031]}
        />

        {/* construction seams — the folded-paper anatomy of the envelope back */}
        {seams.map((pts, i) => (
          <Line
            key={i}
            points={pts}
            color="#8a7343"
            transparent
            opacity={0.09}
            lineWidth={1}
          />
        ))}

        {/* addressed in script, like a real envelope */}
        <Text
          font="/fonts/pinyon-400.ttf"
          fontSize={0.34}
          color="#8f6f2f"
          anchorX="center"
          anchorY="middle"
          position={[0, -1.28, 0.056]}
        >
          Andrei & Anemona
        </Text>
        <Text
          font="/fonts/cinzel-600.ttf"
          fontSize={0.13}
          letterSpacing={0.28}
          color="#6b604d"
          anchorX="center"
          anchorY="middle"
          position={[0, -1.75, 0.056]}
        >
          26 · IX · 2026
        </Text>

        {/* flap, hinged along the top edge */}
        <group ref={flapMountRef} position={[0, EH / 2, 0.06]}>
          <group ref={flapRef} rotation={[-0.045, 0, 0]}>
            <mesh geometry={flapGeo} material={flapMat} position={[0, 0, 0.012]} />
            <mesh geometry={flapGeo} material={liningBackMat} position={[0, 0, 0.004]} />
            <Line
              points={flapOutline}
              color="#b3945a"
              transparent
              opacity={0.55}
              lineWidth={1}
              position={[0, 0, 0.016]}
            />
          </group>
        </group>

        {/* burgundy wax seal */}
        <group
          ref={sealRef}
          position={[0, 0.08, 0.2]}
          onClick={sealClick}
          onPointerOver={() => {
            if (openStart.current === null) {
              setHovered(true)
              document.body.style.cursor = 'pointer'
            }
          }}
          onPointerOut={() => {
            setHovered(false)
            if (!opened) document.body.style.cursor = 'auto'
          }}
        >
          <mesh geometry={waxGeo} material={waxMat} />
          <mesh position={[0, 0, 0.062]}>
            <torusGeometry args={[0.27, 0.011, 12, 60]} />
            <primitive object={waxDarkMat} attach="material" />
          </mesh>
          {/* embossed monogram: dark pressed shadow + light raised face */}
          <Text
            font="/fonts/cinzel-600.ttf"
            fontSize={0.185}
            letterSpacing={0.06}
            color="#3a0a12"
            anchorX="center"
            anchorY="middle"
            position={[0.006, -0.016, 0.074]}
          >
            A·A
          </Text>
          <Text
            font="/fonts/cinzel-600.ttf"
            fontSize={0.185}
            letterSpacing={0.06}
            color="#d9a3a0"
            anchorX="center"
            anchorY="middle"
            position={[0, -0.01, 0.076]}
          >
            A·A
          </Text>
        </group>
      </group>
    </group>
  )
}
