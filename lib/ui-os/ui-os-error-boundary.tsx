"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { UI_OS_FALLBACK_LOG_PREFIX } from "@/lib/ui-os/ui-render-decision";

type UiOsErrorBoundaryProps = {
  pageId: string;
  fallback: ReactNode;
  children: ReactNode;
};

type UiOsErrorBoundaryState = {
  hasError: boolean;
};

export class UiOsErrorBoundary extends Component<UiOsErrorBoundaryProps, UiOsErrorBoundaryState> {
  state: UiOsErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): UiOsErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.warn(UI_OS_FALLBACK_LOG_PREFIX, {
      page: this.props.pageId,
      error: error.message,
      componentStack: info.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
