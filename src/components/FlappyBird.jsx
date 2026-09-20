/**
 * FlappyBird — the orchestrator.
 *
 * Everything per-frame lives in a mutable ref (`g`) and is painted straight
 * onto DOM nodes via imperative handles. React state is touched only for
 * genuinely discrete events: score, best, game state, collapse cycle, and the
 * transient shake/dust FX. That is what keeps the 60 FPS loop off the
 * reconciler.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

import BackgroundCollapse from './BackgroundCollapse'
import Bird, { BIRD_W, BIRD_H } from './Bird'
import Pipe, { PIPE_W } from './Pipe'
import { useGameLoop } from '../hooks/useGameLoop'
import StartScreen from './StartScreen'
import GameOver from './GameOver'

// --- tuning ---------------------------------------------------------------
const GRAVITY = 0.55 // px/frame^2 (fixed 60 Hz step)
const FLAP_V = -8.5 // px/frame on tap — a short, controllable hop
const MAX_FALL = 18 // terminal velocity, keeps dives readable
const PIPE_SPEED = 2.5 // px/frame, travels right -> left
const PIPE_SPAWN_MS = 2400 // longer gap to the next pipe = more reaction time
const PIPE_GAP_MIN = 175 // spec asked wider gaps; this range is generous
const PIPE_GAP_RANGE = 55
const GROUND_H = 96
const BIRD_X_RATIO = 0.28 // bird sits left-of-centre

// The twist's cadence: first collapse at 3 points OR 5 seconds, then every 10.
const FIRST_COLLAPSE_SCORE = 3
const FIRST_COLLAPSE_MS = 5000
const COLLAPSE_EVERY = 10

const BEST_KEY = 'flappy-collapse-best'

const CLOUDS = [
  { s: 150, top: '12%', dur: 34, delay: 0 },
  { s: 90, top: '26%', dur: 46, delay: -12 },
  { s: 210, top: '8%', dur: 60, delay: -30 },
  { s: 110, top: '38%', dur: 40, delay: -22 },
]

/**
 * The mutable game world.
 *
 * Deliberately module scope, not React state: the rAF loop rewrites it ~60x/s
 * and it never feeds the render pass (only refs -> direct DOM writes do), so it
 * carries no reactivity cost and dodges React's "no mutation after render"
 * invariants. `resetWorld()` re-zeroes it at the start of every round.
 *
 * ponytail: a single shared world assumes a single game instance; to mount two
 * games at once, move this into a per-instance ref.
 */
const g = {
  bird: { x: 0, y: 0, vy: 0, rot: 0 },
  pipes: [],
  spawnTimer: 0,
  elapsed: 0,
  cycle: 0,
  nextCollapseScore: FIRST_COLLAPSE_SCORE,
  t: 0, // idle bob clock
}

function resetWorld() {
  g.bird.x = 0
  g.bird.y = 0
  g.bird.vy = 0
  g.bird.rot = 0
  g.pipes.length = 0
  g.spawnTimer = 0
  g.elapsed = 0
  g.cycle = 0
  g.nextCollapseScore = FIRST_COLLAPSE_SCORE
  g.t = 0
}

export default function FlappyBird() {
  const [gameState, setGameState] = useState('idle') // idle | playing | over
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(() => {
    try {
      return Number(localStorage.getItem(BEST_KEY)) || 0
    } catch {
      return 0
    }
  })
  const [cycle, setCycle] = useState(0)
  const [shaking, setShaking] = useState(false)
  const [dust, setDust] = useState([])
  const [isNewBest, setIsNewBest] = useState(false)

  // --- refs: the whole game state, never triggers a render ---------------
  const stageRef = useRef(null)
  const birdRef = useRef(null)
  const pipeRefs = useRef([]) // 4 pipe slots; filled via callback refs
  const dims = useRef({ w: 800, h: 600 })

  const gameStateRef = useRef('idle')
  const scoreRef = useRef(0)
  const bestRef = useRef(best)
  const dustId = useRef(0)

  // --- lifecycle ---------------------------------------------------------
  const endGame = useCallback(() => {
    if (gameStateRef.current !== 'playing') return
    gameStateRef.current = 'over'
    setGameState('over')
    const s = scoreRef.current
    if (s > bestRef.current) {
      bestRef.current = s
      setBest(s)
      setIsNewBest(true)
      try {
        localStorage.setItem(BEST_KEY, String(s))
      } catch {
        /* storage unavailable (private mode) — keep the in-memory best */
      }
    } else {
      setIsNewBest(false)
    }
  }, [])

  const spawnDust = useCallback(() => {
    const { w, h } = dims.current
    const batch = Array.from({ length: 16 }, (_, i) => ({
      id: dustId.current++,
      x: Math.random() * w,
      y: 40 + Math.random() * (h * 0.6),
      size: 4 + Math.random() * 9,
      dx: (Math.random() - 0.5) * 240,
      dy: -50 - Math.random() * 170,
      hue: i % 3,
    }))
    setDust((d) => [...d, ...batch])
    window.setTimeout(() => {
      setDust((d) => d.filter((p) => !batch.includes(p)))
    }, 1500)
  }, [])

  const triggerCollapse = useCallback(() => {
    g.cycle += 1
    g.nextCollapseScore = scoreRef.current + COLLAPSE_EVERY
    setCycle(g.cycle)
    setShaking(true)
    window.setTimeout(() => setShaking(false), 440)
    spawnDust()
  }, [spawnDust])

  const startGame = useCallback(() => {
    const { w, h } = dims.current
    resetWorld()
    g.bird.x = w * BIRD_X_RATIO
    g.bird.y = h * 0.45
    pipeRefs.current.forEach((r) => r?.hide())
    scoreRef.current = 0
    setScore(0)
    setCycle(0)
    setIsNewBest(false)
    gameStateRef.current = 'playing'
    setGameState('playing')
    g.bird.vy = FLAP_V // opening flap
    birdRef.current?.flap()
  }, [])

  const flap = useCallback(() => {
    g.bird.vy = FLAP_V
    birdRef.current?.flap()
  }, [])

  // One input handler covers keyboard, mouse and touch.
  const handleTap = useCallback(() => {
    const s = gameStateRef.current
    if (s === 'idle' || s === 'over') startGame()
    else if (s === 'playing') flap()
  }, [flap, startGame])

  // --- input -------------------------------------------------------------
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space' || e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault() // stop the page scrolling under Space/Up
        if (e.repeat) return
        handleTap()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleTap])

  // --- measure the stage (responsive: desktop 800x600, mobile full-bleed) -
  useEffect(() => {
    const measure = () => {
      const el = stageRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      dims.current = { w: r.width || 800, h: r.height || 600 }
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('orientationchange', measure)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('orientationchange', measure)
    }
  }, [])

  // --- the fixed-timestep loop ------------------------------------------
  const step = useCallback(
    (dt) => {
      const gs = gameStateRef.current
      const { w, h } = dims.current
      const floorY = h - GROUND_H
      const k = dt / (1000 / 60) // 1 at 60 Hz; keeps maths identical if frames are missed
      const b = g.bird
      g.t += dt

      if (gs === 'idle') {
        // Gentle hover on the title screen.
        b.x = w * BIRD_X_RATIO
        b.y = h * 0.42 + Math.sin(g.t / 320) * 14
        b.rot = Math.sin(g.t / 320) * 6
      } else if (gs === 'playing') {
        g.elapsed += dt

        // physics
        b.vy = Math.min(b.vy + GRAVITY * k, MAX_FALL)
        b.y += b.vy * k
        // beak up on the rise, face-plant on the fall
        b.rot = Math.max(-20, Math.min(90, b.vy * 3))

        // world bounds = ceiling and floor
        if (b.y - BIRD_H / 2 < 0) {
          b.y = BIRD_H / 2
          endGame()
        } else if (b.y + BIRD_H / 2 > floorY) {
          b.y = floorY - BIRD_H / 2
          endGame()
        }

        // spawn
        g.spawnTimer += dt
        if (g.spawnTimer >= PIPE_SPAWN_MS) {
          g.spawnTimer -= PIPE_SPAWN_MS
          if (g.pipes.length < 4) {
            const gapH = PIPE_GAP_MIN + Math.random() * PIPE_GAP_RANGE
            const minTop = 36
            const maxTop = Math.max(minTop + 24, floorY - gapH - 48)
            g.pipes.push({
              x: w + 40,
              gapTop: minTop + Math.random() * (maxTop - minTop),
              gapH,
              scored: false,
            })
          }
        }

        // advance + AABB collision + scoring
        for (const p of g.pipes) {
          p.x -= PIPE_SPEED * k
          if (!p.scored && p.x + PIPE_W < b.x) {
            p.scored = true
            scoreRef.current += 1
            setScore(scoreRef.current)
          }
          // precise box-vs-box against both pipe segments
          const bl = b.x - BIRD_W / 2
          const br = b.x + BIRD_W / 2
          const bt = b.y - BIRD_H / 2
          const bb = b.y + BIRD_H / 2
          if (br > p.x && bl < p.x + PIPE_W && (bt < p.gapTop || bb > p.gapTop + p.gapH)) {
            endGame()
          }
        }
        g.pipes = g.pipes.filter((p) => p.x > -120)

        // THE TWIST: peel the background away
        if (g.cycle === 0) {
          if (scoreRef.current >= FIRST_COLLAPSE_SCORE || g.elapsed >= FIRST_COLLAPSE_MS) {
            triggerCollapse()
          }
        } else if (scoreRef.current >= g.nextCollapseScore) {
          triggerCollapse()
        }
      }

      // --- paint (state-independent) ------------------------------------
      birdRef.current?.paint(b.x, b.y, b.rot)
      for (let i = 0; i < 4; i++) {
        const ref = pipeRefs.current[i]
        if (!ref) continue
        const p = g.pipes[i]
        if (p) ref.apply({ x: p.x, gapTop: p.gapTop, gapH: p.gapH, floorY })
        else ref.hide()
      }
    },
    [endGame, triggerCollapse]
  )

  useGameLoop(step, true)

  return (
    <div
      ref={stageRef}
      className={`stage relative overflow-hidden rounded-none shadow-[0_30px_80px_-20px_rgba(0,0,0,0.65)] outline-none sm:rounded-2xl ${
        shaking ? 'stage-shake' : ''
      }`}
      onPointerDown={(e) => {
        e.preventDefault()
        handleTap()
      }}
      style={{ touchAction: 'none' }}
    >
      {/* L0+L1: the sky, and the collapsing grid that reveals the video */}
      <BackgroundCollapse cycle={cycle} />

      {/* parallax clouds (pure CSS) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: 10 }}>
        {CLOUDS.map((c, i) => (
          <div
            key={i}
            className="cloud absolute rounded-full bg-white/55 blur-2xl"
            style={{
              width: c.s,
              height: c.s * 0.5,
              top: c.top,
              left: '115%',
              animationDuration: `${c.dur}s`,
              animationDelay: `${c.delay}s`,
            }}
          />
        ))}
      </div>

      {/* pipes */}
      {[0, 1, 2, 3].map((i) => (
        <Pipe key={i} ref={(el) => { pipeRefs.current[i] = el }} />
      ))}

      {/* bird */}
      <Bird ref={birdRef} />

      {/* ground */}
      <div className="ground-strip pointer-events-none absolute inset-x-0 bottom-0" style={{ height: GROUND_H, zIndex: 20 }} />

      {/* score */}
      {gameState !== 'idle' && (
        <div className="pointer-events-none absolute inset-x-0 top-6 flex justify-center" style={{ zIndex: 40 }}>
          <span
            className="text-6xl font-black text-white sm:text-7xl"
            style={{
              WebkitTextStroke: '3px rgba(10,20,40,0.55)',
              paintOrder: 'stroke',
              filter: 'drop-shadow(0 4px 0 rgba(10,20,40,0.35))',
            }}
          >
            {score}
          </span>
        </div>
      )}

      {/* collapse dust */}
      {dust.map((p) => (
        <motion.div
          key={p.id}
          className="pointer-events-none absolute rounded-full"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            zIndex: 45,
            background:
              p.hue === 0 ? 'rgba(216,186,140,0.9)' : p.hue === 1 ? 'rgba(150,150,160,0.7)' : 'rgba(255,235,180,0.85)',
          }}
          initial={{ opacity: 0.95, x: 0, y: 0, scale: 1 }}
          animate={{ opacity: 0, x: p.dx, y: p.dy, scale: 2.4 }}
          transition={{ duration: 1.3, ease: 'easeOut' }}
        />
      ))}

      {/* UI overlays */}
      {gameState === 'idle' && <StartScreen best={best} onPlay={startGame} />}
      {gameState === 'over' && (
        <GameOver score={score} best={best} isNewBest={isNewBest} onRestart={startGame} />
      )}
    </div>
  )
}
