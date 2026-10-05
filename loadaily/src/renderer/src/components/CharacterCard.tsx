import { useEffect, useState } from 'react'
import type { Character } from '../../../main/services/accountStore'
import InlineEdit from './InlineEdit'

interface CharacterCardProps {
  character: Character
  onRename: (name: string) => void
  onItemLevel: (itemLevel: number) => void
  onRemove: () => void
}

export default function CharacterCard({ character, onRename, onItemLevel, onRemove }: CharacterCardProps): JSX.Element {
  const [ilvl, setIlvl] = useState(String(character.itemLevel))
  const [ilvlError, setIlvlError] = useState<string | null>(null)

  useEffect(() => { setIlvl(String(character.itemLevel)) }, [character.itemLevel])

  const commitIlvl = (): void => {
    const n = Number(ilvl)
    if (ilvl.trim() === '' || !Number.isInteger(n) || n < 0) {
      setIlvlError('需为非负整数')
      return
    }
    setIlvlError(null)
    if (n !== character.itemLevel) onItemLevel(n)
  }

  return (
    <div className="char-card">
      <InlineEdit className="char-name" value={character.name} onSubmit={onRename} placeholder="未命名角色" />
      <div className="char-field">
        <label>装备等级</label>
        <input
          className="input char-ilvl"
          value={ilvl}
          inputMode="numeric"
          onChange={e => setIlvl(e.target.value)}
          onBlur={commitIlvl}
          onKeyDown={e => {
            if (e.key === 'Enter') commitIlvl()
            else if (e.key === 'Escape') { setIlvl(String(character.itemLevel)); setIlvlError(null) }
          }}
        />
      </div>
      {ilvlError ? <div className="err">{ilvlError}</div> : null}
      <div className="char-actions">
        <button className="btn link err" onClick={onRemove}>删除</button>
      </div>
    </div>
  )
}
