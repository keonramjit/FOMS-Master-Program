import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center bg-slate-50 border border-slate-200 rounded-xl m-4">
          <div className="bg-red-100 p-4 rounded-full mb-4 text-red-600">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">This module has encountered an error</h2>
          <p className="text-slate-500 mb-6 max-w-md">
            We encountered an error while loading this module. Please try reloading.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            <RefreshCw size={18} />
            Reload Module
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
