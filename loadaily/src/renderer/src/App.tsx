import { useCallback, useEffect, useState } from 'react'
import type { Account } from '../../main/services/accountStore'
import ConfirmModal from './components/ConfirmModal'
import PromptModal from './components/PromptModal'

export type Mutate = (op: () => Promise<Account[]>) => Promise<void>

export default function App(): JSX.Element {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [addingAccount, setAddingAccount] = useState(false)
  const [renamingAccount, setRenamingAccount] = useState<Account | null>(null)
  const [removingAccount, setRemovingAccount] = useState<Account | null>(null)

  const run: Mutate = useCallback(async (op) => {
    try {
      setAccounts(await op())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    window.api.accounts.list()
      .then(list => { setAccounts(list); setError(null) })
      .catch(e => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [])

  const activeAccount = accounts.find(a => a.id === activeAccountId) ?? accounts[0] ?? null

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-title">loadaily</span>
        <span className="hint">{accounts.length} 个账号</span>
      </header>

      {error ? <div className="app-error">{error}</div> : null}

      <nav className="tab-bar">
        {accounts.map(a => (
          <button
            key={a.id}
            className={`tab${activeAccount?.id === a.id ? ' active' : ''}`}
            onClick={() => setActiveAccountId(a.id)}
            onDoubleClick={() => setRenamingAccount(a)}
            title="双击重命名"
          >
            {a.name}
          </button>
        ))}
        <button className="tab-add" onClick={() => setAddingAccount(true)} title="新增账号">＋</button>
      </nav>

      <main className="tab-body">
        {loading ? (
          <div className="empty-hint">加载中…</div>
        ) : !activeAccount ? (
          <div className="empty-hint">还没有账号，点击上方「＋」新增账号。</div>
        ) : (
          <div className="card">
            <div className="card-head">
              <h3>{activeAccount.name}</h3>
              <div>
                <button className="btn link" onClick={() => setRenamingAccount(activeAccount)}>重命名</button>
                <button className="btn link err" onClick={() => setRemovingAccount(activeAccount)}>删除</button>
              </div>
            </div>
            <div className="hint">远征队与角色区在后续任务实现。</div>
          </div>
        )}
      </main>

      <PromptModal
        open={addingAccount}
        title="新增账号"
        label="账号名字"
        placeholder="例如：主账号"
        onSubmit={value => {
          setAddingAccount(false)
          void run(() => window.api.accounts.addAccount(value))
        }}
        onCancel={() => setAddingAccount(false)}
      />

      <PromptModal
        open={renamingAccount !== null}
        title="重命名账号"
        label="账号名字"
        defaultValue={renamingAccount?.name ?? ''}
        onSubmit={value => {
          const target = renamingAccount
          setRenamingAccount(null)
          if (target) void run(() => window.api.accounts.renameAccount(target.id, value))
        }}
        onCancel={() => setRenamingAccount(null)}
      />

      <ConfirmModal
        open={removingAccount !== null}
        title="删除账号"
        message={`确定删除账号「${removingAccount?.name ?? ''}」？其下的远征队与角色会一并删除。`}
        onConfirm={() => {
          const target = removingAccount
          setRemovingAccount(null)
          if (target) void run(() => window.api.accounts.removeAccount(target.id))
        }}
        onCancel={() => setRemovingAccount(null)}
      />
    </div>
  )
}
