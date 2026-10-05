import { useEffect, useRef, useState } from 'react'

interface InlineEditProps {
  value: string
  onSubmit: (value: string) => void
  className?: string
  placeholder?: string
  /** 未选中的宿主（如未选中的 tab）不允许进入编辑。默认 true。 */
  editable?: boolean
  /** 不可编辑时点击文本的回调（通常用于先把宿主选中）。 */
  onSelect?: () => void
}

export default function InlineEdit({
  value,
  onSubmit,
  className,
  placeholder,
  editable = true,
  onSelect
}: InlineEditProps): JSX.Element {
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

  /** 宿主失去编辑资格（例如切到了别的 tab）时收起输入框，不提交。 */
  useEffect(() => {
    if (!editable) setEditing(false)
  }, [editable])

  const commit = (): void => {
    setEditing(false)
    const next = draft.trim()
    if (!next || next === value) return
    onSubmit(next)
  }

  if (!editing) {
    return (
      <div
        className={className}
        title={editable ? '点击编辑' : undefined}
        onClick={e => {
          // 宿主自身多半也有 onClick（tab 选中）；可编辑时拦住，避免一次点击做两件事。
          if (editable) {
            e.stopPropagation()
            setEditing(true)
          } else {
            onSelect?.()
          }
        }}
      >
        {value || <span className="hint">{placeholder ?? '未命名'}</span>}
      </div>
    )
  }

  return (
    <input
      ref={inputRef}
      className={`input inline-edit-input${className ? ` ${className}` : ''}`}
      value={draft}
      onClick={e => e.stopPropagation()}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') commit()
        else if (e.key === 'Escape') {
          e.stopPropagation()
          setDraft(value)
          setEditing(false)
        }
      }}
    />
  )
}
