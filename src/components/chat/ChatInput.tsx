import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Send, Square } from 'lucide-react'
import { VoiceButton } from './VoiceButton'
import { ApprovalDialog } from './ApprovalDialog'
import { useVoiceStore } from '../../stores/voiceStore'
import type { AgentToolCall } from '../../types/agent-mode'

interface Props {
  onSend: (content: string) => void
  onStop: () => void
  isGenerating: boolean
  pendingApproval?: AgentToolCall | null
  onApprove?: () => void
  onReject?: () => void
}

export function ChatInput({ onSend, onStop, isGenerating, pendingApproval, onApprove, onReject }: Props) {
  const [input, setInput] = useState('')
  const [isVoiceRecording, setIsVoiceRecording] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isTranscribing = useVoiceStore((s) => s.isTranscribing)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'
    }
  }, [input])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || isGenerating) return
    onSend(trimmed)
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (isVoiceRecording || isTranscribing) return
      handleSend()
    }
  }

  return (
    <div className="px-3 pb-2 pt-1">
      {/* Approval dialog */}
      {pendingApproval && onApprove && onReject && (
        <ApprovalDialog toolCall={pendingApproval} onApprove={onApprove} onReject={onReject} />
      )}

      <div className="flex items-end gap-2 rounded-lg bg-white/[0.03] border border-white/[0.06] px-2.5 py-2">
        <VoiceButton
          onTranscript={(text) => { setInput(text); requestAnimationFrame(() => { if (textareaRef.current) { textareaRef.current.style.height = 'auto'; textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px' } }) }}
          onRecordingChange={(r) => setIsVoiceRecording(r)}
          disabled={isGenerating}
        />

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isTranscribing ? "Transcribing..." : isVoiceRecording ? "Recording..." : "Message..."}
          rows={1}
          className="flex-1 bg-transparent resize-none text-gray-200 placeholder-gray-600 focus:outline-none text-[0.75rem] leading-relaxed max-h-[200px]"
        />

        {isGenerating ? (
          <motion.button
            onClick={onStop}
            className="p-1.5 rounded-md bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-all shrink-0"
            whileTap={{ scale: 0.9 }}
            aria-label="Stop generation"
          >
            <Square size={13} />
          </motion.button>
        ) : (
          <motion.button
            onClick={handleSend}
            disabled={!input.trim() || isTranscribing}
            className="p-1.5 rounded-md bg-white/8 text-gray-300 hover:bg-white/12 disabled:opacity-20 disabled:cursor-not-allowed transition-all shrink-0"
            whileTap={{ scale: 0.9 }}
            aria-label="Send message"
          >
            <Send size={13} />
          </motion.button>
        )}
      </div>
    </div>
  )
}
