import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import Experience from './Experience'
import Invitation from './Invitation'
import { setMuted } from './audio'

function MuteButton() {
  const [muted, setMutedState] = useState(false)
  const toggle = () => {
    const next = !muted
    setMutedState(next)
    setMuted(next)
  }
  return (
    <button
      className="mute"
      onClick={toggle}
      aria-label={muted ? 'Pornește sunetul' : 'Oprește sunetul'}
      title={muted ? 'Pornește sunetul' : 'Oprește sunetul'}
    >
      {muted ? (
        <svg viewBox="0 0 24 24" fill="none">
          <path
            d="M4 9v6h4l5 4V5L8 9H4z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M17 9l4 6M21 9l-4 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none">
          <path
            d="M4 9v6h4l5 4V5L8 9H4z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  )
}

export default function App() {
  const [ready, setReady] = useState(false)
  const [phase, setPhase] = useState('sealed') // sealed → opening → revealed

  // wait for the fonts before drawing the 3D card texture & showing the scene
  useEffect(() => {
    let alive = true
    Promise.all(
      [
        '600 1em Cinzel',
        '1em Cinzel',
        '1em "Cormorant Garamond"',
        'italic 1em "Cormorant Garamond"',
        '1em "Pinyon Script"',
      ].map((f) => document.fonts.load(f))
    )
      .then(() => document.fonts.ready)
      .then(() => {
        setTimeout(() => alive && setReady(true), 600)
      })
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="stage">
      {ready && (
        <Canvas
          flat
          dpr={[1, 2]}
          camera={{ fov: 40, position: [0, 0.1, 8.4] }}
          gl={{ antialias: true, alpha: true }}
        >
          <Suspense fallback={null}>
            <Experience
              phase={phase}
              onBegin={() => setPhase('opening')}
              onRevealed={() => setPhase('revealed')}
            />
          </Suspense>
        </Canvas>
      )}

      <div className={`hint${phase !== 'sealed' ? ' gone' : ''}`}>
        Atingeți sigiliul pentru a deschide
      </div>

      <Invitation active={phase === 'revealed'} />

      <MuteButton />

      <div className="grain" />
      <div className="vignette" />

      <div className={`loader${ready ? ' hidden' : ''}`}>
        <div className="monogram">A &amp; A</div>
        <div className="line" />
      </div>
    </div>
  )
}
