import { motion } from 'framer-motion'

export default function GameOver({ score, best, isNewBest, onRestart }) {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 text-center"
      style={{ zIndex: 50, background: 'rgba(8,14,30,0.5)', backdropFilter: 'blur(3px)' }}
      initial={{ opacity: 0, scale: 1.08 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      <h2
        className="text-4xl font-black text-white sm:text-6xl"
        style={{
          WebkitTextStroke: '3px rgba(10,20,40,0.6)',
          paintOrder: 'stroke',
          filter: 'drop-shadow(0 5px 0 rgba(10,20,40,0.4))',
        }}
      >
        GAME OVER
      </h2>

      {isNewBest && (
        <motion.span
          className="rounded-full bg-amber-400 px-4 py-1 text-sm font-black text-[#3a2a06] shadow-[0_3px_0_#b97e16]"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          NEW BEST!
        </motion.span>
      )}

      <div className="flex items-stretch gap-4">
        <div className="rounded-2xl bg-white/12 px-7 py-4 ring-1 ring-white/25">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Score</p>
          <p className="text-4xl font-black text-white sm:text-5xl">{score}</p>
        </div>
        <div className="rounded-2xl bg-white/12 px-7 py-4 ring-1 ring-white/25">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Best</p>
          <p className="text-4xl font-black text-amber-300 sm:text-5xl">{best}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onRestart()
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="mt-1 rounded-full bg-amber-400 px-10 py-3.5 text-lg font-black text-[#3a2a06] shadow-[0_5px_0_#b97e16,0_10px_18px_rgba(0,0,0,0.35)] transition-transform hover:scale-105 active:translate-y-1 active:shadow-[0_2px_0_#b97e16]"
      >
        RETRY
      </button>

      <p className="text-xs font-semibold text-white/55">Space / Click / Tap to retry</p>
    </motion.div>
  )
}
