"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { GestionaleErrorFallback } from "@/components/observability/gestionale-error-fallback";
import { forceReleaseAllBodyScrollLocks } from "@/lib/ui/body-scroll-lock-manager";
import { recordFatal } from "@/lib/observability/fatal-aggregator";
import { gestionaleLogger } from "@/lib/observability/logger";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class GestionaleClientErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    forceReleaseAllBodyScrollLocks("error-boundary");
    recordFatal("boundary.crash", { message: error.message });
    gestionaleLogger.error("react.error_boundary", {
      operation: "system",
      meta: {
        message: error.message,
        digest: (error as Error & { digest?: string }).digest,
        componentStack: info.componentStack?.slice(0, 2000),
      },
    });
  }

  render() {
    if (this.state.error) {
      return (
        <GestionaleErrorFallback
          variant="gestionale"
          message={this.state.error.message}
          digest={(this.state.error as Error & { digest?: string }).digest}
          onRetry={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}
