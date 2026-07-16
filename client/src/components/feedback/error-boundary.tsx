import { Component, type ErrorInfo, type ReactNode } from "react";
import { isRouteErrorResponse, useRouteError } from "react-router-dom";

import { Button } from "@/components/ui/button";

type ErrorBoundaryProps = {
  children?: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      message: "An unexpected error occurred.",
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message,
    };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Application error boundary caught an error", { error, errorInfo });
  }

  public override render() {
    if (this.state.hasError) {
      return <ErrorState title="Something went wrong" message={this.state.message} />;
    }

    return this.props.children;
  }
}

export function RouteErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return <ErrorState title={`${error.status} ${error.statusText}`} message={error.data} />;
  }

  if (error instanceof Error) {
    return <ErrorState title="Something went wrong" message={error.message} />;
  }

  return <ErrorState title="Something went wrong" message="The application hit an unknown error." />;
}

function ErrorState({ title, message }: { title: string; message: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 text-foreground">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
        <p className="text-lg font-semibold text-card-foreground">{title}</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{message}</p>
        <Button type="button" className="mt-5" onClick={() => window.location.assign("/")}>
          Return home
        </Button>
      </div>
    </div>
  );
}

