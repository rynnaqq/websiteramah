import { forwardRef, useImperativeHandle, useRef } from 'react'

/**
 * Bird — a pure presentational DOM entity.
 *
 * FlappyBird positions it every frame by writing a `translate3d(...) rotate()`
 * transform straight onto the root node. That keeps the 60 FPS loop off the
 * React reconciler entirely (no setState per frame).
 *
 * The root is pre-offset by -50% so the transform's (x, y) is the bird's
 * CENTER, which makes the collision maths in FlappyBird trivial.
 */
const W = 50
const H = 34

const Bird = forwardRef((_, ref) => {
  const root = useRef(null)
  const wing = useRef(null)

  useImperativeHandle(ref, () => ({
    // Briefly overclock the wing flap on input, for a little punch.
    flap() {
      const el = wing.current
      if (!el) return
      el.style.animationDuration = '0.1s'
      clearTimeout(el._t)
      el._t = setTimeout(() => {
        el.style.animationDuration = '0.32s'
      }, 260)
    },
    // Position by the centre. Called from the fixed-timestep loop.
    paint(x, y, rot) {
      const el = root.current
      if (!el) return
      el.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) rotate(${rot.toFixed(2)}deg)`
    },
  }))

  return (
    <div
      ref={root}
      className="absolute will-change-transform"
      style={{ width: W, height: H, left: -W / 2, top: -H / 2, zIndex: 30 }}
    >
      {/* body */}
      <div
        className="absolute inset-0"
        style={{
          borderRadius: '46% 54% 50% 50% / 56% 50% 50% 44%',
          background: 'linear-gradient(160deg,#ffe66d 0%,#f7b731 60%,#dd951b 100%)',
          boxShadow: '0 3px 0 #b97e16, 0 6px 12px rgba(0,0,0,.28)',
        }}
      />
      {/* belly highlight */}
      <div
        className="absolute"
        style={{
          left: 6, top: 17, width: 26, height: 14,
          borderRadius: '50%', background: '#fff3cf', opacity: 0.75,
        }}
      />
      {/* wing (CSS keyframes, see index.css) */}
      <div
        ref={wing}
        className="wing absolute"
        style={{
          left: 7, top: 8, width: 19, height: 14, borderRadius: '50%',
          background: 'linear-gradient(160deg,#fff6d8,#ffd23f)',
          boxShadow: 'inset 0 -2px 0 rgba(0,0,0,.14)',
        }}
      />
      {/* eye */}
      <div
        className="absolute"
        style={{
          left: 28, top: 4, width: 13, height: 13, borderRadius: '50%',
          background: '#fff', boxShadow: 'inset 0 0 0 1.5px #5b4a2a',
        }}
      >
        <div
          className="absolute"
          style={{
            left: 6.5, top: 3.5, width: 5, height: 5, borderRadius: '50%', background: '#23201a',
          }}
        />
      </div>
      {/* beak */}
      <div
        className="absolute"
        style={{
          left: 40, top: 12, width: 9, height: 7,
          background: 'linear-gradient(180deg,#ff9f43,#e67e22)',
          borderRadius: '2px 6px 6px 2px', boxShadow: '0 1px 0 #b35c0e',
        }}
      />
    </div>
  )
})

Bird.displayName = 'Bird'
export default Bird
export const BIRD_W = W
export const BIRD_H = H
