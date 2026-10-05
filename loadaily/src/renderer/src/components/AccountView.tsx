import { useState } from 'react'
import type { Account, Roster } from '../../../main/services/accountStore'
import type { Mutate } from '../App'
import ConfirmModal from './ConfirmModal'
import PromptModal from './PromptModal'

interface AccountViewProps {
  account: Account
  run: Mutate
}

export default function AccountView({ account, run }: AccountViewProps): JSX.Element {
  const [activeRosterId, setActiveRosterId] = useState<string | null>(null)
  const [addingRoster, setAddingRoster] = useState(false)
  const [renamingRoster, setRenamingRoster] = useState<Roster | null>(null)
  const [removingRoster, setRemovingRoster] = useState<Roster | null>(null)
  const [removingCharacterId, setRemovingCharacterId] = useState<string | null>(null)

  const activeRoster = account.rosters.find(r => r.id === activeRosterId) ?? account.rosters[0] ?? null
  const removingCharacter = activeRoster?.characters.find(c => c.id === removingCharacterId) ?? null

  return (
    <>
      <div className="sub-tab-bar">
        {account.rosters.map(r => (
          <span
            key={r.id}
            className={`sub-tab${activeRoster?.id === r.id ? ' active' : ''}`}
            onClick={() => setActiveRosterId(r.id)}
            onDoubleClick={() => setRenamingRoster(r)}
            title="双击重命名"
          >
            <span className="tab-label">{r.name}</span>
            {activeRoster?.id === r.id ? (
              <span className="tab-actions">
                <button
                  className="btn link tab-act"
                  title="重命名远征队"
                  onClick={e => { e.stopPropagation(); setRenamingRoster(r) }}
                >重命名</button>
                <button
                  className="btn link err tab-act"
                  title="删除远征队"
                  onClick={e => { e.stopPropagation(); setRemovingRoster(r) }}
                >删除</button>
              </span>
            ) : null}
          </span>
        ))}
        <button className="tab-add" onClick={() => setAddingRoster(true)} title="新增远征队">＋</button>
      </div>

      {activeRoster ? (
        <div className="card">
          <div className="card-head">
            <h3>{activeRoster.name}</h3>
          </div>
          <div className="hint">角色卡区在后续任务实现。</div>
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
          void run(() => window.api.accounts.addRoster(account.id, value))
        }}
        onCancel={() => setAddingRoster(false)}
      />

      <PromptModal
        open={renamingRoster !== null}
        title="重命名远征队"
        label="远征队名字"
        defaultValue={renamingRoster?.name ?? ''}
        onSubmit={value => {
          const target = renamingRoster
          setRenamingRoster(null)
          if (target) void run(() => window.api.accounts.renameRoster(target.id, value))
        }}
        onCancel={() => setRenamingRoster(null)}
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
    </>
  )
}
