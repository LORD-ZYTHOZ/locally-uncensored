import { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check, ChevronDown } from 'lucide-react'

interface Props {
  code: string
  language?: string
}

const COLLAPSE_THRESHOLD = 4 // lines — always start collapsed unless very short

export function CodeBlock({ code, language }: Props) {
  const [copied, setCopied] = useState(false)
  const lineCount = code.split('\n').length
  const isLong = lineCount > COLLAPSE_THRESHOLD
  const [expanded, setExpanded] = useState(!isLong)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const displayCode = expanded ? code : code.split('\n').slice(0, COLLAPSE_THRESHOLD).join('\n')

  return (
    <div className="relative group rounded-lg overflow-hidden my-1.5 border border-gray-200 dark:border-white/5">
      <div className="flex items-center justify-between px-3 py-1 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/5">
        <span className="text-[0.6rem] text-gray-400 font-mono">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[0.6rem] text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
          aria-label="Copy code"
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '0.75rem',
          background: 'rgba(0, 0, 0, 0.3)',
          fontSize: '0.75rem',
        }}
      >
        {displayCode}
      </SyntaxHighlighter>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 py-1 bg-gray-50 dark:bg-white/5 text-[0.55rem] text-gray-400 hover:text-gray-700 dark:hover:text-white border-t border-gray-200 dark:border-white/5 transition-colors"
        >
          <ChevronDown size={9} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          {expanded ? 'Collapse' : `Show all ${lineCount} lines`}
        </button>
      )}
    </div>
  )
}
