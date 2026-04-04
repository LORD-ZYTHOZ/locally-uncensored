import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUpCircle, ExternalLink, X } from 'lucide-react'
import { useUpdateStore, initUpdateChecker } from '../../stores/updateStore'

export function UpdateBadge() {
  const {
    currentVersion,
    latestVersion,
    updateAvailable,
    releaseNotes,
    dismissed,
    isChecking,
    checkForUpdate,
    dismissUpdate,
    openReleasePage,
  } = useUpdateStore()

  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Init update checker on mount
  useEffect(() => {
    initUpdateChecker()
  }, [])

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Don't show if no update or dismissed this version
  const showBadge = updateAvailable && latestVersion && dismissed !== latestVersion

  if (!showBadge) return null

  return (
    <div ref={ref} className="relative">
      {/* Pulsing badge button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-1 rounded-md text-emerald-400 hover:bg-emerald-500/10 transition-colors"
        title={`Update available: v${latestVersion}`}
      >
        <ArrowUpCircle size={20} strokeWidth={1.8} />
        {/* Pulsing dot */}
        <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400">
          <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
        </span>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute right-0 top-full mt-1.5 w-64 rounded-lg overflow-hidden z-50 bg-[#0f0f0f] border border-white/[0.06] shadow-2xl shadow-black/50"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 pt-3 pb-1">
              <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-emerald-400/70">
                Update Available
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); dismissUpdate(); setOpen(false) }}
                className="p-0.5 rounded text-gray-600 hover:text-gray-300 transition-colors"
                title="Dismiss"
              >
                <X size={12} />
              </button>
            </div>

            {/* Version info */}
            <div className="px-3 py-2">
              <div className="flex items-center gap-2 text-[0.7rem]">
                <span className="text-gray-500">v{currentVersion}</span>
                <span className="text-gray-600">→</span>
                <span className="text-emerald-400 font-medium">v{latestVersion}</span>
              </div>
            </div>

            {/* Release notes */}
            {releaseNotes && (
              <div className="px-3 pb-2">
                <p className="text-[0.6rem] text-gray-500 leading-relaxed line-clamp-4 whitespace-pre-line">
                  {releaseNotes}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="border-t border-white/[0.04] p-2 flex gap-1.5">
              <button
                onClick={() => { openReleasePage(); setOpen(false) }}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[0.65rem] font-medium bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors"
              >
                <ExternalLink size={11} />
                Download Update
              </button>
              <button
                onClick={() => { dismissUpdate(); setOpen(false) }}
                className="px-2 py-1.5 rounded-md text-[0.65rem] text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] transition-colors"
              >
                Later
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
