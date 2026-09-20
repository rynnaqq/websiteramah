import { motion } from 'framer-motion'

export default function StartScreen({ best, onPlay }) {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-6 text-center"
      style={{ zIndex: 50, background: 'rgba(8,14,30,0.42)', backdropFilter: 'blur(2px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <h1
          className="text-5xl font-black tracking-tight text-white sm:text-7xl"
          style={{
            WebkitTextStroke: '3px rgba(10,20,40,0.6)',
            paintOrder: 'stroke',
            filter: 'drop-shadow(0 6px 0 rgba(10,20,40,0.4))',
          }}
        >
          FLAPPY
        </h1>
        <h1
          className="-mt-2 text-5xl font-black tracking-tight text-amber-300 sm:text-7xl"
          style={{
            WebkitTextStroke: '3px rgba(10,20,40,0.6)',
            paintOrder: 'stroke',
            filter: 'drop-shadow(0 6px 0 rgba(10,20,40,0.4))',
          }}
        >
          COLLAPSE
        </h1>
      </motion.div>

      <p className="max-w-sm text-sm font-medium text-white/85 sm:text-base">
        Flap through the pipes. The world falls apart behind you — reach{' '}
        <b className="text-amber-300">3 points</b> or survive <b className="text-amber-300">5 seconds</b> and watch the
        sky shatter.
      </p>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onPlay()
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="rounded-full bg-amber-400 px-10 py-3.5 text-lg font-black text-[#3a2a06] shadow-[0_5px_0_#b97e16,0_10px_18px_rgba(0,0,0,0.35)] transition-transform hover:scale-105 active:translate-y-1 active:shadow-[0_2px_0_#b97e16]"
      >
        PLAY
      </button>

      <p className="text-xs font-semibold text-white/55">
        Space / Click / Tap to flap{best > 0 ? ` · Best ${best}` : ''}
      </p>
    </motion.div>
  )
}
