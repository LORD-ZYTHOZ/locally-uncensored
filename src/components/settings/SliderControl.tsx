interface Props {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}

export function SliderControl({ label, value, min, max, step, onChange }: Props) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[0.7rem] text-gray-500 dark:text-gray-400 w-20 shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-0.5 accent-gray-400 cursor-pointer"
      />
      <span className="text-[0.65rem] font-mono text-gray-400 dark:text-gray-500 w-8 text-right">{value}</span>
    </div>
  )
}
