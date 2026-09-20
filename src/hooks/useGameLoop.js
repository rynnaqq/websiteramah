import { useEffect, useRef } from 'react'

/**
 * Fixed-timestep requestAnimationFrame loop.
 *
 * `callback` receives a constant step of 1000/60 ms, so physics expressed in
 * "per-frame" units (gravity 0.5, pipe speed 2.5...) stays identical on a
 * 60 Hz phone and a 144 Hz monitor. Accumulator drift is clamped so a
 * backgrounded tab can't fast-forward the game by seconds.
 *
 * The latest callback is stored in a ref, so callers can pass an inline
 * closure every render without re-subscribing the rAF chain.
 */
export function useGameLoop(callback, running = true) {
  const cb = useRef(callback)
  // Kept in an effect (not during render) so React's fast-refresh/StrictMode
  // invariants hold; the rAF tick always runs after this, so it never sees a
  // stale callback.
  useEffect(() => {
    cb.current = callback
  })

  useEffect(() => {
    if (!running) return
    const STEP = 1000 / 60
    let raf = 0
    let last = performance.now()
    let acc = 0

    const tick = (now) => {
      raf = requestAnimationFrame(tick)
      acc += Math.min(now - last, STEP * 5)
      last = now
      // Run at least once so a very fast frame still advances the world.
      let guard = 0
      while (acc >= STEP && guard < 5) {
        cb.current(STEP)
        acc -= STEP
        guard += 1
      }
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [running])
}
