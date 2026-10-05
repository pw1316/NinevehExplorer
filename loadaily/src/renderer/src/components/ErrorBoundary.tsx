import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  message: string | null
}

/**
 * React 18 unmounts the whole tree on an uncaught render error, which leaves a
 * blank window with no way to learn what happened or where the data lives.
 * This keeps the failure visible and actionable instead.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { message: null }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { message: error instanceof Error ? error.message : String(error) }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('界面渲染失败', error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.message === null) return this.props.children
    return (
      <div className="app-shell">
        <header className="app-header">
          <span className="app-title">loadaily</span>
        </header>
        <main className="tab-body">
          <div className="card">
            <div className="card-head"><h3>界面出错了</h3></div>
            <div className="modal-message">{this.state.message}</div>
            <div className="hint">
              数据文件位于应用目录下的 <code>loadaily_Data/accounts.json</code>。
              可以先把该文件移走再重启，确认是否是数据导致的问题。
            </div>
            <div className="modal-actions">
              <button className="btn primary" onClick={() => window.location.reload()}>重新加载</button>
            </div>
          </div>
        </main>
      </div>
    )
  }
}
