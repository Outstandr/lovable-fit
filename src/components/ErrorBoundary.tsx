import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    
    // In production, send to error monitoring service
    // Example: Sentry.captureException(error);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/'; // Navigate to home
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <div className="max-w-md w-full tactical-card text-center space-y-6">
            <AlertTriangle className="h-16 w-16 text-destructive mx-auto" />
            
            <div>
              <h1 className="text-xl font-bold uppercase tracking-wider text-foreground mb-2">
                Something Went Wrong
              </h1>
              <p className="text-sm text-muted-foreground">
                The app encountered an unexpected error. We've logged the issue.
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="text-left bg-secondary/50 p-4 rounded-lg">
                <p className="text-xs font-mono text-destructive break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <Button onClick={this.handleReset} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Return to Home
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
