// Sound design — everything is synthesized with WebAudio, no audio files.
// - seal crack: layered noise snaps + a low wax "thump"
// - paper: filtered noise swells
// - music: generative harp (Karplus–Strong plucks) over a soft pad, D major

let ctx = null
let master = null
let sfxBus = null
let musicBus = null
let reverb = null
let muted = false
let musicRunning = false

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    ctx = new AC()

    master = ctx.createGain()
    master.gain.value = muted ? 0 : 1
    master.connect(ctx.destination)

    // generated impulse-response reverb (soft hall)
    reverb = ctx.createConvolver()
    reverb.buffer = makeImpulse(3.2, 2.6)
    const reverbGain = ctx.createGain()
    reverbGain.gain.value = 0.5
    reverb.connect(reverbGain)
    reverbGain.connect(master)

    sfxBus = ctx.createGain()
    sfxBus.gain.value = 0.55
    sfxBus.connect(master)
    sfxBus.connect(reverb)

    musicBus = ctx.createGain()
    musicBus.gain.value = 0.16
    musicBus.connect(master)
    musicBus.connect(reverb)
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function makeImpulse(duration, decay) {
  const rate = ctx.sampleRate
  const len = Math.floor(rate * duration)
  const buf = ctx.createBuffer(2, len, rate)
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c)
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
    }
  }
  return buf
}

function noiseBuffer(duration) {
  const rate = ctx.sampleRate
  const len = Math.floor(rate * duration)
  const buf = ctx.createBuffer(1, len, rate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  return buf
}

export function setMuted(m) {
  muted = m
  if (master) {
    const t = ctx.currentTime
    master.gain.cancelScheduledValues(t)
    master.gain.linearRampToValueAtTime(m ? 0 : 1, t + 0.25)
  }
}

export function isMuted() {
  return muted
}

/* ————— SFX ————— */

export function playSealCrack() {
  ensureCtx()
  const t0 = ctx.currentTime

  // two brittle snaps
  ;[0, 0.07].forEach((dt, i) => {
    const src = ctx.createBufferSource()
    src.buffer = noiseBuffer(0.09)
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = i === 0 ? 2100 : 1150
    bp.Q.value = 1.6
    const g = ctx.createGain()
    g.gain.setValueAtTime(i === 0 ? 0.9 : 0.7, t0 + dt)
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dt + 0.09)
    src.connect(bp).connect(g).connect(sfxBus)
    src.start(t0 + dt)
  })

  // low wax thump
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(150, t0)
  osc.frequency.exponentialRampToValueAtTime(52, t0 + 0.22)
  const og = ctx.createGain()
  og.gain.setValueAtTime(0.5, t0)
  og.gain.exponentialRampToValueAtTime(0.001, t0 + 0.28)
  osc.connect(og).connect(sfxBus)
  osc.start(t0)
  osc.stop(t0 + 0.3)
}

export function playPaper(duration = 0.8, peak = 0.32) {
  ensureCtx()
  const t0 = ctx.currentTime
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer(duration + 0.1)
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(600, t0)
  lp.frequency.linearRampToValueAtTime(3200, t0 + duration * 0.45)
  lp.frequency.linearRampToValueAtTime(500, t0 + duration)
  lp.Q.value = 0.4
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(peak, t0 + duration * 0.4)
  g.gain.exponentialRampToValueAtTime(0.001, t0 + duration)
  src.connect(lp).connect(g).connect(sfxBus)
  src.start(t0)
}

/* ————— Generative harp music ————— */

const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12)

// D major, gentle progression: D — Bm — G — A
const CHORDS = [
  [50, 57, 62, 66, 69, 74], // D:  D3 A3 D4 F#4 A4 D5
  [47, 54, 59, 62, 66, 71], // Bm: B2 F#3 B3 D4 F#4 B4
  [43, 55, 59, 62, 67, 71], // G:  G2 G3 B3 D4 G4 B4
  [45, 52, 57, 61, 64, 69], // A:  A2 E3 A3 C#4 E4 A4
]

const pluckCache = new Map()

function pluckBuffer(freq) {
  const key = Math.round(freq * 10)
  if (pluckCache.has(key)) return pluckCache.get(key)
  const rate = ctx.sampleRate
  const dur = 2.8
  const N = Math.round(rate / freq)
  const len = Math.floor(rate * dur)
  const buf = ctx.createBuffer(1, len, rate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < N; i++) d[i] = Math.random() * 2 - 1
  for (let i = N; i < len; i++) {
    d[i] = 0.997 * 0.5 * (d[i - N] + d[i - N + 1])
  }
  pluckCache.set(key, buf)
  return buf
}

function pluck(freq, when, vel) {
  const src = ctx.createBufferSource()
  src.buffer = pluckBuffer(freq)
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 2600
  const g = ctx.createGain()
  g.gain.value = vel
  src.connect(lp).connect(g).connect(musicBus)
  src.start(when)
  src.stop(when + 3)
}

function pad(rootMidi, when, barLen) {
  const freqs = [midiToFreq(rootMidi - 12), midiToFreq(rootMidi - 5)]
  freqs.forEach((f, i) => {
    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = f
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, when)
    g.gain.linearRampToValueAtTime(i === 0 ? 0.05 : 0.03, when + barLen * 0.45)
    g.gain.linearRampToValueAtTime(0.0001, when + barLen + 0.4)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 700
    osc.connect(lp).connect(g).connect(musicBus)
    osc.start(when)
    osc.stop(when + barLen + 0.6)
  })
}

let nextBarTime = 0
let barIndex = 0
let schedTimer = null

function scheduleBars() {
  const BAR = 5.2
  const LOOKAHEAD = 2.0
  while (nextBarTime < ctx.currentTime + LOOKAHEAD) {
    const chord = CHORDS[barIndex % CHORDS.length]
    pad(chord[0], nextBarTime, BAR)

    // 5–7 harp plucks scattered through the bar, low to high
    const n = 5 + Math.floor(Math.random() * 3)
    let t = nextBarTime + Math.random() * 0.4
    for (let i = 0; i < n; i++) {
      const note = chord[Math.min(chord.length - 1, 1 + Math.floor(Math.random() * (chord.length - 1)))]
      const octaveLift = Math.random() < 0.22 ? 12 : 0
      pluck(midiToFreq(note + octaveLift), t, 0.16 + Math.random() * 0.12)
      t += BAR / n * (0.65 + Math.random() * 0.7)
    }
    nextBarTime += BAR
    barIndex++
  }
  schedTimer = setTimeout(scheduleBars, 500)
}

export function startMusic() {
  ensureCtx()
  if (musicRunning) return
  musicRunning = true
  nextBarTime = ctx.currentTime + 1.6 // let the seal/paper moment breathe first
  scheduleBars()
}

export function stopMusic() {
  musicRunning = false
  if (schedTimer) clearTimeout(schedTimer)
}
