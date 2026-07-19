import { useEffect, useMemo, useRef, useState } from 'react'

const WEDDING_DATE = new Date('2026-09-26T16:00:00+03:00')

const CHURCH_MAP =
  'https://www.google.com/maps/search/?api=1&query=Biserica+Grecescu+Drobeta-Turnu+Severin'
const VENUE_MAP =
  'https://www.google.com/maps/search/?api=1&query=Conacul+Jean+C.+Mihail+Rogova'

function CornerFlourish({ className }) {
  return (
    <svg className={`corner ${className}`} viewBox="0 0 54 54" fill="none">
      <path
        d="M4 50 C4 22 22 4 50 4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M10 50 C10 26 26 10 50 10"
        stroke="currentColor"
        strokeWidth="0.8"
        strokeLinecap="round"
        opacity="0.6"
      />
      <circle cx="4" cy="50" r="2" fill="currentColor" />
      <circle cx="50" cy="4" r="2" fill="currentColor" />
    </svg>
  )
}

function Divider() {
  return (
    <div className="divider" aria-hidden="true">
      <span className="d-line" />
      <svg viewBox="0 0 26 26" fill="none">
        <path
          d="M13 3 L17 13 L13 23 L9 13 Z"
          stroke="currentColor"
          strokeWidth="1.1"
          fill="none"
        />
        <circle cx="13" cy="13" r="1.6" fill="currentColor" />
      </svg>
      <span className="d-line right" />
    </div>
  )
}

function MapPin() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21s-7-5.5-7-11a7 7 0 1 1 14 0c0 5.5-7 11-7 11z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function useCountdown() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return useMemo(() => {
    let diff = Math.max(0, WEDDING_DATE.getTime() - now)
    const days = Math.floor(diff / 86400000)
    diff -= days * 86400000
    const hours = Math.floor(diff / 3600000)
    diff -= hours * 3600000
    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff - minutes * 60000) / 1000)
    return { days, hours, minutes, seconds }
  }, [now])
}

// width-to-height ratio of the physical 3D card (CW 2.98 × CH 4.06)
const CARD_RATIO = 4.06 / 2.98

export default function Invitation({ active }) {
  const cd = useCountdown()
  const cardRef = useRef(null)
  const [sent, setSent] = useState(false)
  const [form, setForm] = useState({
    name: '',
    attending: 'da',
    count: '2',
    allergies: '',
  })

  // The card arrives clipped to the exact size of the 3D card it replaces,
  // then unfolds downward to reveal the countdown and the RSVP form —
  // the guest experiences one single invitation throughout.
  const [maxH, setMaxH] = useState(null)
  useEffect(() => {
    if (!active) return
    const w = Math.min(600, window.innerWidth * 0.94)
    setMaxH(Math.round(w * CARD_RATIO))
    const t = setTimeout(() => {
      setMaxH(cardRef.current ? cardRef.current.scrollHeight : 2600)
    }, 850)
    return () => clearTimeout(t)
  }, [active])

  const attending = form.attending === 'da'
  const firstName = form.name.trim().split(/\s+/)[0] || ''

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      nume: form.name.trim(),
      prezenta: form.attending,
      numar_persoane: attending ? Number(form.count) : 0,
      alergii: form.allergies.trim(),
      trimis_la: new Date().toISOString(),
    }
    // TODO (Lovable): trimite payload-ul către backend / bază de date.
    console.log('[RSVP]', payload)
    setSent(true)
  }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  return (
    <div className={`invitation${active ? ' active' : ''}`} aria-hidden={!active}>
      <div className="card-wrap">
        <div
          className="card"
          ref={cardRef}
          style={maxH != null ? { maxHeight: `${maxH}px` } : undefined}
          onTransitionEnd={(e) => {
            // once fully unfolded, release the clamp so content can reflow freely
            if (
              e.propertyName === 'max-height' &&
              cardRef.current &&
              maxH >= cardRef.current.scrollHeight
            ) {
              setMaxH(99999)
            }
          }}
        >
          <CornerFlourish className="tl" />
          <CornerFlourish className="tr" />
          <CornerFlourish className="bl" />
          <CornerFlourish className="br" />

          <div className="card-inner">
            <p className="eyebrow">Împreună cu cei dragi</p>

            <h1 className="names">Andrei &amp; Anemona</h1>

            <p className="intro-line">
              avem bucuria de a vă invita să ne fiți alături în ziua în care
              spunem „da”
            </p>

            <div className="date-block">26 · IX · 2026</div>
            <p className="date-sub">sâmbătă</p>

            <div className="venues">
              <div className="venue">
                <p className="v-label">Cununia religioasă</p>
                <p className="v-time">
                  ora <strong>16:00</strong>
                </p>
                <p className="v-place">Biserica „Grecescu” · Drobeta-Turnu Severin</p>
                <a
                  className="map-link"
                  href={CHURCH_MAP}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapPin /> Vezi harta
                </a>
              </div>

              <div className="venue">
                <p className="v-label">Petrecerea</p>
                <p className="v-time">
                  ora <strong>19:00</strong>
                </p>
                <p className="v-place">Conacul Jean C. Mihail · Rogova</p>
                <a
                  className="map-link"
                  href={VENUE_MAP}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapPin /> Vezi harta
                </a>
              </div>
            </div>

            <Divider />

            <div className="countdown" aria-label="Numărătoare inversă">
              <div className="cd-item">
                <div className="cd-num">{cd.days}</div>
                <div className="cd-label">Zile</div>
              </div>
              <div className="cd-item">
                <div className="cd-num">{String(cd.hours).padStart(2, '0')}</div>
                <div className="cd-label">Ore</div>
              </div>
              <div className="cd-item">
                <div className="cd-num">{String(cd.minutes).padStart(2, '0')}</div>
                <div className="cd-label">Minute</div>
              </div>
              <div className="cd-item">
                <div className="cd-num">{String(cd.seconds).padStart(2, '0')}</div>
                <div className="cd-label">Secunde</div>
              </div>
            </div>

            <Divider />

            {!sent ? (
              <>
                <h2 className="rsvp-title">Confirmați prezența</h2>
                <p className="rsvp-deadline">
                  vă rugăm, până la <strong>6 septembrie 2026</strong>
                </p>

                <form className="rsvp-form" onSubmit={handleSubmit}>
                  <div className="field">
                    <label htmlFor="rsvp-name">Nume și prenume</label>
                    <input
                      id="rsvp-name"
                      type="text"
                      required
                      placeholder="ex. Maria și Ion Popescu"
                      value={form.name}
                      onChange={set('name')}
                    />
                  </div>

                  <div className="field">
                    <label>Veți fi alături de noi?</label>
                    <div className="attend-row">
                      <label className="attend-option">
                        <input
                          type="radio"
                          name="attending"
                          value="da"
                          checked={form.attending === 'da'}
                          onChange={set('attending')}
                        />
                        <span>Confirmăm cu bucurie</span>
                      </label>
                      <label className="attend-option">
                        <input
                          type="radio"
                          name="attending"
                          value="nu"
                          checked={form.attending === 'nu'}
                          onChange={set('attending')}
                        />
                        <span>Din păcate, nu putem ajunge</span>
                      </label>
                    </div>
                  </div>

                  {attending && (
                    <>
                      <div className="field">
                        <label htmlFor="rsvp-count">Număr de persoane</label>
                        <div className="select-wrap">
                          <select
                            id="rsvp-count"
                            value={form.count}
                            onChange={set('count')}
                          >
                            {[1, 2, 3, 4, 5, 6].map((n) => (
                              <option key={n} value={n}>
                                {n} {n === 1 ? 'persoană' : 'persoane'}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="field">
                        <label htmlFor="rsvp-allergies">
                          Alergii sau preferințe alimentare{' '}
                          <em style={{ textTransform: 'none', letterSpacing: 0 }}>
                            (opțional)
                          </em>
                        </label>
                        <textarea
                          id="rsvp-allergies"
                          placeholder="ex. fără gluten, meniu vegetarian…"
                          value={form.allergies}
                          onChange={set('allergies')}
                        />
                      </div>
                    </>
                  )}

                  <button className="submit-btn" type="submit">
                    Trimite confirmarea
                  </button>
                </form>
              </>
            ) : (
              <div className="success">
                <div className="s-check">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M4 12.5 L10 18 L20 6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h3>{firstName ? `Mulțumim, ${firstName}!` : 'Vă mulțumim!'}</h3>
                {attending ? (
                  <p>
                    Confirmarea a fost trimisă. Vă așteptăm cu drag pe{' '}
                    <strong>26 septembrie 2026</strong> — ne vedem la Severin!
                  </p>
                ) : (
                  <p>
                    Ne pare rău că nu veți putea fi alături de noi — vă mulțumim
                    din suflet că ne-ați anunțat.
                  </p>
                )}
              </div>
            )}

            <div className="signature">
              <p className="s-with">cu drag,</p>
              <p className="s-names">Andrei &amp; Anemona</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
