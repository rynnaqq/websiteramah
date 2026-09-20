import { forwardRef, useImperativeHandle, useRef } from 'react'

/**
 * Pipe — a single green pipe (top half + bottom half) around a vertical gap.
 *
 * FlappyBird renders a FIXED POOL of these slots and never adds/removes DOM
 * nodes during play. Each frame it calls `apply()` with the pipe's geometry
 * and we move the halves by writing styles directly — zero React re-renders
 * at 60 FPS, and every change is a transform/size (GPU-friendly).
 */
export const PIPE_W = 64
const CAP_H = 16
const CAP_OVER = 5 // the lip sticks out this far on each side

const BODY_BG =
  'linear-gradient(90deg,#2f7a34 0%,#5cb85c 16%,#9ed68c 34%,#63ae57 58%,#2f7a34 100%)'
const CAP_BG = 'linear-gradient(90deg,#3f8f42 0%,#7cc46e 22%,#a8e092 46%,#57a84f 70%,#3f8f42 100%)'

const Pipe = forwardRef((_, ref) => {
  const root = useRef(null)
  const top = useRef(null)
  const bottom = useRef(null)

  useImperativeHandle(ref, () => ({
    /**
     * Position this pipe slot.
     * @param x       left edge, in px
     * @param gapTop  y where the gap starts
     * @param gapH    gap height
     * @param floorY  y of the ground top (bottom pipe ends here)
     */
    apply({ x, gapTop, gapH, floorY }) {
      const el = root.current
      if (!el) return
      el.style.transform = `translate3d(${x | 0}px,0,0)`
      el.style.visibility = 'visible'

      // Top half: ceiling -> gapTop
      const t = top.current
      t.style.height = `${Math.max(gapTop, 0) | 0}px`

      // Bottom half: gapTop+gapH -> floor
      const b = bottom.current
      b.style.top = `${(gapTop + gapH) | 0}px`
      b.style.height = `${Math.max(floorY - (gapTop + gapH), 0) | 0}px`
    },
    hide() {
      if (root.current) root.current.style.visibility = 'hidden'
    },
  }))

  return (
    <div
      ref={root}
      className="absolute left-0 top-0 will-change-transform"
      style={{ width: PIPE_W, height: 0, visibility: 'hidden', zIndex: 20 }}
    >
      {/* ---- top half: hangs from the ceiling, lip at its bottom ---- */}
      <div ref={top} className="absolute left-0 top-0 w-full" style={{ overflow: 'visible' }}>
        <div
          className="absolute inset-x-0 top-0"
          style={{ height: 'calc(100% + 2px)', background: BODY_BG, borderTopRightRadius: 6 }}
        />
        <div
          className="absolute"
          style={{
            left: -CAP_OVER, bottom: 0, width: PIPE_W + CAP_OVER * 2, height: CAP_H,
            background: CAP_BG, borderRadius: 7,
            boxShadow: '0 2px 0 rgba(0,0,0,.22), inset 0 2px 0 rgba(255,255,255,.28)',
          }}
        />
      </div>

      {/* ---- bottom half: stands on the floor, lip at its top ---- */}
      <div ref={bottom} className="absolute left-0 w-full" style={{ overflow: 'visible' }}>
        <div
          className="absolute inset-x-0 bottom-0"
          style={{ height: 'calc(100% + 2px)', background: BODY_BG, borderBottomRightRadius: 6 }}
        />
        <div
          className="absolute"
          style={{
            left: -CAP_OVER, top: 0, width: PIPE_W + CAP_OVER * 2, height: CAP_H,
            background: CAP_BG, borderRadius: 7,
            boxShadow: '0 -2px 0 rgba(0,0,0,.18), inset 0 -2px 0 rgba(255,255,255,.22)',
          }}
        />
      </div>
    </div>
  )
})

Pipe.displayName = 'Pipe'
export default Pipe
export const PIPE_POOL = 4
