import { motion } from 'framer-motion'
import { ShieldAlert } from 'lucide-react'
import type { AgentToolCall } from '../../types/agent-mode'
import { ToolCallBlock } from './ToolCallBlock'

interface Props {
  toolCall: AgentToolCall
  onApprove: () => void
  onReject: () => void
}

export function ApprovalDialog({ toolCall, onApprove, onReject }: Props) {
  return (
    <motion.div
      className="px-3 pb-2"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <ShieldAlert size={11} className="text-amber-400" />
        <span className="text-[0.6rem] text-amber-400/80 font-medium">
          Approval required
        </span>
      </div>
      <ToolCallBlock
        toolCall={toolCall}
        onApprove={onApprove}
        onReject={onReject}
      />
    </motion.div>
  )
}
