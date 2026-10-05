import { useEffect, useRef, useState } from 'react'

interface InlineEditProps {
  value: string
  onSubmit: (value: string) => void
  className?: string
  placeholder?: string
}

export default function InlineEdit({ value, onSubmit, className, placeholder }: InlineEditProps): JSX.Element {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  useEffect(() => {
    if (!editing) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [editing])

  const commit = (): void => {
    setEditing(false)
    const next = draft.trim()
    if (!next || next === value) return
    onSubmit(next)
  }

  if (!editing) {
    return (
      <div className={className} onClick={() => setEditing(true)} title="点击编辑">
        {value || <span className="hint">{placeholder ?? '未命名'}</span>}
      </div>
    )
  }

  return (
    <input
      ref={inputRef}
      className={`input inline-edit-input${className ? ` ${className}` : ''}`}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') commit()
        else if (e.key === 'Escape') {
          setDraft(value)
          setEditing(false)
        }
      }}
    />
  )
}
