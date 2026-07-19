# Invitație nuntă — Andrei & Anemona

Interactive 3D wedding invitation / RSVP page (Romanian). The guest sees a sealed
envelope, taps the gold wax seal, the flap opens, the invitation card slides out,
and the page crossfades into the full invitation with the RSVP form.

**Event:** 26 septembrie 2026 (sâmbătă) · Cununia 16:00 — Biserica „Grecescu",
Drobeta-Turnu Severin · Petrecerea 19:00 — Conacul Jean C. Mihail, Rogova ·
RSVP până la 6 septembrie 2026.

## Run

```bash
npm install
npm run dev
```

## Stack

- Vite + React 19
- three.js + @react-three/fiber + @react-three/drei (the 3D envelope scene)
- No CSS framework — all styling in `src/index.css`
- No audio files — all sound is synthesized with WebAudio (`src/audio.js`)
- Fonts self-hosted in `public/fonts` (Cinzel, Cormorant Garamond, Pinyon Script)
- AI-generated material photos in `public/textures` (paper, wax, lining) — loaded
  and post-processed at runtime in `src/textures.js`; keep these files

## Structure

| File | Role |
|---|---|
| `src/App.jsx` | Phases (`sealed → opening → revealed`), loader, mute button |
| `src/Experience.jsx` | Scene: lights, environment, gold dust, responsive camera |
| `src/Envelope.jsx` | Envelope geometry, wax seal, opening timeline |
| `src/Invitation.jsx` | DOM invitation: countdown, venues + map links, **RSVP form** |
| `src/textures.js` | Procedural canvas textures (paper, lining, card face) |
| `src/audio.js` | Seal crack / paper SFX + generative harp background music |

## Backend TODO (for Lovable)

The RSVP form is fully working UI with a **mock submit**. The single integration
point is `handleSubmit` in `src/Invitation.jsx` — it currently does
`console.log('[RSVP]', payload)`. Replace that with a real write (e.g. Supabase
`rsvps` table). Payload shape:

```json
{
  "nume": "Maria și Ion Popescu",
  "prezenta": "da",
  "numar_persoane": 2,
  "alergii": "fără gluten",
  "trimis_la": "2026-07-19T09:30:00.000Z"
}
```

`prezenta` is `"da"` or `"nu"`; `numar_persoane` is `0` when `prezenta === "nu"`;
`alergii` is free text and may be empty.

Keep the existing success state (`setSent(true)`) after a successful write, and
add basic error handling (keep the form visible + show a gentle Romanian error
message if the write fails).

Everything else (3D scene, animation timeline, sound, countdown, styling) is
design-final — please don't restructure it.
