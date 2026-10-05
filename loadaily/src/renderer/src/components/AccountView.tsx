import { useEffect, useRef, useState } from 'react'
import type { Account, Roster } from '../../../main/services/accountStore'
import type { Mutate } from '../App'
import CharacterCard from './CharacterCard'
import ConfirmModal from './ConfirmModal'
import InlineEdit from './InlineEdit'
import PromptModal from './PromptModal'
import TrashIcon from './TrashIcon'

interface AccountViewProps {
  account: Account
  run: Mutate
}

export default function AccountView({ account, run }: AccountViewProps): JSX.Element {
  const [activeRosterId, setActiveRosterId] = useState<string | null>(null)
  const [addingRoster, setAddingRoster] = useState(false)
  const [removingRoster, setRemovingRoster] = useState<Roster | null>(null)
  const [removingCharacterId, setRemovingCharacterId] = useState<string | null>(null)
  const [addingCharacter, setAddingCharacter] = useState(false)
  const [focusCharacterId, setFocusCharacterId] = useState<string | null>(null)
  const charRowRef = useRef<HTMLDivElement>(null)

  const activeRoster = account.rosters.find(r => r.id === activeRosterId) ?? account.rosters[0] ?? null
  const removingCharacter = activeRoster?.characters.find(c => c.id === removingCharacterId) ?? null

  // A new card lands at the end of a horizontally scrolling row, so without this
  // it can be created off-screen and look like nothing happened.
  useEffect(() => {
    if (!focusCharacterId) return
    const el = charRowRef.current?.querySelector(`[data-character-id="${focusCharacterId}"]`)
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    setFocusCharacterId(null)
  }, [focusCharacterId, account])

  return (
    <>
      <div className="sub-tab-bar">
        {account.rosters.map(r => {
          const isActive = activeRoster?.id === r.id
          return (
            <span
              key={r.id}
              className={`sub-tab${isActive ? ' active' : ''}`}
              onClick={() => setActiveRosterId(r.id)}
            >
              <InlineEdit
                className="tab-label"
                value={r.name}
                editable={isActive}
                onSelect={() => setActiveRosterId(r.id)}
                onSubmit={name => { void run(() => window.api.accounts.renameRoster(r.id, name)) }}
              />
              {isActive ? (
                <span className="tab-actions">
                  <button
                    className="icon-btn tab-act"
                    title="删除远征队"
                    onClick={e => { e.stopPropagation(); setRemovingRoster(r) }}
                  ><TrashIcon /></button>
                </span>
              ) : null}
            </span>
          )
        })}
        <button className="tab-add" onClick={() => setAddingRoster(true)} title="新增远征队">＋</button>
      </div>

      {activeRoster ? (
        <div className="card">
          <div className="card-head">
            <h3>{activeRoster.name}</h3>
          </div>
          <div className="char-row" ref={charRowRef}>
            {activeRoster.characters.map(c => (
              <CharacterCard
                key={c.id}
                character={c}
                onRename={name => { void run(() => window.api.accounts.updateCharacter(c.id, { name })) }}
                onItemLevel={itemLevel => { void run(() => window.api.accounts.updateCharacter(c.id, { itemLevel })) }}
                onRemove={() => setRemovingCharacterId(c.id)}
              />
            ))}
            <div className="char-card">
              <button className="btn" onClick={() => setAddingCharacter(true)}>＋ 新增角色</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="empty-hint">该账号还没有远征队，点击上方「＋」新增远征队。</div>
      )}

      <PromptModal
        open={addingRoster}
        title="新增远征队"
        label="远征队名字"
        placeholder="例如：主远征队"
        onSubmit={value => {
          setAddingRoster(false)
          void run(() => window.api.accounts.addRoster(account.id, value)).then(next => {
            // 选中刚建好的远征队，否则新建后子 tab 看起来没变化
            const created = next?.find(a => a.id === account.id)?.rosters.slice(-1)[0]
            if (created) setActiveRosterId(created.id)
          })
        }}
        onCancel={() => setAddingRoster(false)}
      />

      <ConfirmModal
        open={removingRoster !== null}
        title="删除远征队"
        message={`确定删除远征队「${removingRoster?.name ?? ''}」？其下的角色会一并删除。`}
        onConfirm={() => {
          const target = removingRoster
          setRemovingRoster(null)
          if (target) void run(() => window.api.accounts.removeRoster(target.id))
        }}
        onCancel={() => setRemovingRoster(null)}
      />

      <ConfirmModal
        open={removingCharacter !== null}
        title="删除角色"
        message={`确定删除角色「${removingCharacter?.name ?? ''}」？`}
        onConfirm={() => {
          const target = removingCharacter
          setRemovingCharacterId(null)
          if (target) void run(() => window.api.accounts.removeCharacter(target.id))
        }}
        onCancel={() => setRemovingCharacterId(null)}
      />

      <PromptModal
        open={addingCharacter}
        title="新增角色"
        label="角色名字"
        placeholder="例如：法师"
        onSubmit={value => {
          const target = activeRoster
          setAddingCharacter(false)
          if (!target) return
          void run(() => window.api.accounts.addCharacter(target.id, value, 0)).then(next => {
            const created = next?.find(a => a.id === account.id)
              ?.rosters.find(r => r.id === target.id)?.characters.slice(-1)[0]
            if (created) setFocusCharacterId(created.id)
          })
        }}
        onCancel={() => setAddingCharacter(false)}
      />
    </>
  )
}
