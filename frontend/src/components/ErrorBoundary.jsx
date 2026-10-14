import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * Enterprise Application Error Boundary
 * Catches render-time JavaScript exceptions and displays a graceful Editorial recovery UI
 * preventing blank white screens.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('POS Application ErrorBoundary caught an exception:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  handleNavigateHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-screen bg-[#F7EFE4] dark:bg-[#101A18] flex items-center justify-center p-6 select-none font-sans">
          <div className="max-w-md w-full bg-[#FFFDF9] dark:bg-[#152320] border border-[#E4DCD0] dark:border-[#1E362E] rounded-3xl p-8 shadow-editorial-lg text-center animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-[#173F36] dark:text-[#9FB29E] flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h2 className="text-xl font-serif font-bold text-[#17251F] dark:text-[#F7EFE4] tracking-tight">
              Something went wrong loading your workspace.
            </h2>

            <p className="text-xs text-[#657168] dark:text-[#9FB29E] mt-2 leading-relaxed">
              An unexpected error occurred while rendering this view. Your session and operational data remain safe.
            </p>

            {this.state.error?.message && (
              <div className="mt-4 p-3 rounded-xl bg-[#F7EFE4] dark:bg-[#101A18] border border-[#E4DCD0] dark:border-[#1E362E] text-left text-[11px] font-mono text-rose-700 dark:text-rose-400 max-h-28 overflow-y-auto break-words">
                {this.state.error.message}
              </div>
            )}

            <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#173F36] hover:bg-[#12332C] text-white rounded-xl text-xs font-semibold transition shadow-editorial cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry Station</span>
              </button>

              <button
                type="button"
                onClick={this.handleNavigateHome}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#F7EFE4] dark:bg-[#1E362E] hover:bg-[#E4DCD0] dark:hover:bg-[#254238] text-[#17251F] dark:text-[#F7EFE4] border border-[#E4DCD0] dark:border-[#254238] rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Default Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
