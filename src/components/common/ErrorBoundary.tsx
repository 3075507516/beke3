import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[fox3 Application ErrorBoundary Caught]:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleResetCache = () => {
    try {
      // Clear potentially corrupt keys while preserving essential settings if possible
      localStorage.removeItem('fox3_current_user');
      localStorage.removeItem('fox3_system_settings');
      localStorage.removeItem('fox3_view_modes');
      sessionStorage.clear();
    } catch (e) {
      console.warn('Failed clearing cache:', e);
    }
    window.location.href = '/';
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800/90 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <h1 className="text-xl font-bold text-white mb-2">系统运行拦截并已保护恢复</h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                页面遇到异常未捕获错误，fox3 防白屏熔断保护机制已激活。您可尝试刷新页面，或一键重置本地异常缓存并重新加载。
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-slate-950/70 rounded-xl text-left font-mono text-[11px] text-rose-400 overflow-x-auto max-h-32 border border-slate-800">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>刷新重试</span>
              </button>
              <button
                onClick={this.handleResetCache}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>清除缓存并重置</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
