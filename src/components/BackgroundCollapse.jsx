/**
 * ============================================================================
 *  BackgroundCollapse — THE TWIST
 * ============================================================================
 *
 * Two stacked layers inside the game area:
 *
 *   zIndex 0  base gradient (fallback sky, shown when there is no video)
 *   zIndex 1  <video> reveal wrapper  (opacity/scale/blur in over 2.5s)
 *   zIndex 2  readability scrim       rgba(0,0,0,0.2) so the bird/pipes pop
 *   zIndex 3  the COLLAPSING layer    either a solid skin, or a 20x12 grid
 *                                      of motion.div tiles that fall away
 *
 * Flow:
 *   cycle 0  -> the original sky gradient sits on top (nothing behind it yet)
 *   cycle 1  -> that gradient is sliced into 240 tiles that scatter+fall,
 *               revealing the video (or the fallback sky) underneath
 *   cycle 2+ -> every 10 points a new cycle fires; this time the layer that
 *               collapses is a translucent tint, so the video is revealed
 *               again through a different filter — the background keeps
 *               evolving instead of collapsing the identical thing twice
 *
 * The tile grid uses the classic CSS sprite-slicing trick: every tile paints
 * the SAME gradient, but `background-size` is blown up to COLS*100% x
 * ROWS*100% and `background-position` is set to c/(COLS-1), r/(ROWS-1). The
 * 240 tiles therefore reassemble the original image pixel-perfectly, and each
 * one can then be animated independently with GPU transforms.
 * ============================================================================
 */

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

// --- grid geometry ---------------------------------------------------------
const COLS = 20
const ROWS = 12

// --- timing ---------------------------------------------------------------
const TILE_FALL = 1.2 // seconds for a tile to fall away
const VIDEO_REVEAL = 2.5 // seconds for the video to fade/scale/blur in
const ZOOM_CYCLE = 20 // seconds for the slow video parallax zoom 1 -> 1.1

/**
 * Where the video comes from.
 *
 * Spec: prefer a hashed import from /src/assets, fall back to /public.
 * `import.meta.glob` returns `{}` (it never throws) when the pattern matches
 * nothing, so this safely supports BOTH locations.
 */
const ASSET_GLOB = import.meta.glob('../assets/videos.mp4', {
  eager: true,
  query: '?url',
  import: 'default',
})
const VIDEO_SRC = ASSET_GLOB['../assets/videos.mp4'] ?? '/videos.mp4'

/**
 * What the video falls back to when there is no videos.mp4 at all.
 * Deliberately a NIGHT sky, so the cycle-1 collapse of the day-blue gradient
 * is still a visible "gradient -> colour reveal" even without a video.
 */
const FALLBACK_SKY = 'linear-gradient(180deg,#0b1026 0%,#1b2a4a 58%,#35547a 100%)'

/**
 * One skin per collapse cycle (wraps). `background` is what the tiles paint;
 * `videoFilter` is cross-faded onto the video as it is revealed.
 */
const SKINS = [
  { background: 'linear-gradient(180deg,#70c5ce 0%,#9adbe3 55%,#b3e5fc 100%)' }, // the original sky
  { background: 'rgba(11,16,38,0.55)', videoFilter: 'saturate(1.3) contrast(1.06)' },
  { background: 'rgba(112,197,206,0.45)', videoFilter: 'hue-rotate(40deg)' },
  { background: 'rgba(76,40,110,0.5)', videoFilter: 'hue-rotate(-28deg) saturate(1.2)' },
]

/** Per-tile background: gradient skins get sliced, flat skins are just flat. */
function tilePaint(skin, c, r) {
  if (String(skin.background).startsWith('linear-gradient')) {
    return {
      backgroundImage: skin.background,
      backgroundSize: `${COLS * 100}% ${ROWS * 100}%`,
      backgroundPosition: `${(c / (COLS - 1)) * 100}% ${(r / (ROWS - 1)) * 100}%`,
    }
  }
  return { background: skin.background }
}

export default function BackgroundCollapse({ cycle = 0, onCollapseStart, onCollapseEnd }) {
  // null = no grid in flight (show the solid skin instead)
  const [tiles, setTiles] = useState(null)
  // true once the very first collapse has begun; the solid skin never returns
  // after that (otherwise it would snap back and re-cover the video)
  const [peeled, setPeeled] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)
  const [videoFilter, setVideoFilter] = useState('none')

  const skin = SKINS[((cycle - 1) % SKINS.length + SKINS.length) % SKINS.length]
  const revealed = cycle >= 1 && !videoFailed

  // --- trigger a collapse whenever `cycle` advances -----------------------
  useEffect(() => {
    if (cycle < 1) {
      // A fresh round: bring the solid sky back and hide the video again.
      setTiles(null)
      setPeeled(false)
      setVideoFilter('none')
      return
    }

    setPeeled(true)
    setVideoFilter(skin.videoFilter ?? 'none')

    // Slice the current skin into a COLS x ROWS grid.
    const built = []
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        built.push({
          key: `${cycle}-${r}-${c}`,
          c,
          r,
          paint: tilePaint(skin, c, r),
          // stagger from top-left, plus a little organic jitter
          delay: c * 0.03 + r * 0.04 + Math.random() * 0.3,
          y: 800 + Math.random() * 200, // fall
          x: (Math.random() - 0.5) * 400, // scatter
          rotate: (Math.random() - 0.5) * 720,
        })
      }
    }
    setTiles(built)

    // Sound-effect placeholder (no audio asset bundled yet).
    console.log('collapse!')
    onCollapseStart?.()

    // Tear the grid down once the slowest tile has landed, so 240 nodes are
    // never left in the DOM between collapses.
    const longest = (COLS - 1) * 0.03 + (ROWS - 1) * 0.04 + 0.3 + TILE_FALL
    const timer = setTimeout(() => {
      setTiles(null)
      onCollapseEnd?.()
    }, longest * 1000 + 250)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycle])

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 0, pointerEvents: 'none' }}>
      {/* 0 — fallback sky, always present under everything else */}
      <div className="absolute inset-0" style={{ background: FALLBACK_SKY }} />

      {/* 1 — the video, revealed by a 2.5s opacity/scale/blur fade */}
      <motion.div
        className="absolute inset-0"
        style={{ transformOrigin: 'center' }}
        initial={{ opacity: 0, scale: 1.12, filter: 'blur(10px)' }}
        animate={{
          opacity: revealed ? 1 : 0,
          scale: revealed ? 1 : 1.12,
          filter: revealed ? 'blur(0px)' : 'blur(10px)',
        }}
        transition={{ duration: VIDEO_REVEAL, ease: 'easeOut' }}
      >
        <motion.video
          className="absolute inset-0 h-full w-full object-cover"
          src={VIDEO_SRC}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          // slow parallax zoom 1 -> 1.1 -> 1, breathing in and out
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: ZOOM_CYCLE, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: 'center', filter: videoFilter, transition: 'filter 1.6s ease' }}
          onError={() => setVideoFailed(true)}
        />
      </motion.div>

      {/* 2 — readability scrim so gameplay stays legible over busy video */}
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.2)', zIndex: 2 }} />

      {/* 3a — the solid skin, shown only before the first collapse */}
      {!tiles && !peeled && (
        <div className="absolute inset-0" style={{ zIndex: 3, background: SKINS[0].background }} />
      )}

      {/* 3b — the collapsing grid */}
      {tiles && (
        <div className="absolute inset-0" style={{ zIndex: 3 }}>
          {tiles.map((t) => (
            <motion.div
              key={t.key}
              className="absolute"
              style={{
                left: `${(t.c / COLS) * 100}%`,
                top: `${(t.r / ROWS) * 100}%`,
                width: `${100 / COLS}%`,
                height: `${100 / ROWS}%`,
                transformOrigin: 'center',
                backfaceVisibility: 'hidden',
                willChange: 'transform, opacity',
                ...t.paint,
              }}
              initial={{ opacity: 1, scale: 1, x: 0, y: 0, rotate: 0 }}
              animate={{ opacity: 0, scale: 0, x: t.x, y: t.y, rotate: t.rotate }}
              transition={{ delay: t.delay, duration: TILE_FALL, ease: 'easeIn' }}
            />
          ))}
        </div>
      )}

      {/* 4 — friendly placeholder when no video was found */}
      {videoFailed && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ zIndex: 4, pointerEvents: 'none' }}
        >
          <p className="rounded-xl bg-black/55 px-4 py-2 text-center text-xs font-semibold text-white/85 backdrop-blur-sm">
            Please place your videos.mp4 in /public folder
          </p>
        </div>
      )}
    </div>
  )
}
