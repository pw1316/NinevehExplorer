import { useEffect, useRef, useState } from 'react'

interface PromptModalProps {
  open: boolean
  title: string
  label?: string
  defaultValue?: string
  placeholder?: string
  onSubmit: (value: string) => void
  onCancel: () => void
}

export default function PromptModal({ open, title, label, defaultValue = '', placeholder, onSubmit, onCancel }: PromptModalProps): JSX.Element | null {
  const [value, setValue] = useState(defaultValue)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setValue(defaultValue)
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [open, defaultValue])

  if (!open) return null

  const submit = (): void => {
    if (!value.trim()) return
    onSubmit(value)
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{title}</div>
        {label ? <div className="modal-label">{label}</div> : null}
        <input
          ref={inputRef}
          className="modal-input"
          value={value}
          placeholder={placeholder}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') submit()
            else if (e.key === 'Escape') onCancel()
          }}
        />
        <div className="modal-actions">
          <button className="btn primary" onClick={submit} disabled={!value.trim()}>确定</button>
          <button className="btn" onClick={onCancel}>取消</button>
        </div>
      </div>
    </div>
  )
}
