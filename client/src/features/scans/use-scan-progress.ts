import { useEffect, useState } from "react";

import { environment } from "@/config/environment";
import { getAccessToken } from "@/services/api/auth-session-store";
import type { ScanProgressSnapshot, ScanStatus } from "@/types/scan";

type UseScanProgressResult = {
  progress: ScanProgressSnapshot | null;
  isConnected: boolean;
  error: string | null;
};

const TERMINAL_SCAN_STATUSES: ScanStatus[] = ["COMPLETED", "FAILED", "CANCELLED"];

export function useScanProgress(
  projectId: string | undefined,
  scanId: string | undefined,
  enabled: boolean,
): UseScanProgressResult {
  const [progress, setProgress] = useState<ScanProgressSnapshot | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId || !scanId || !enabled) {
      setIsConnected(false);
      setProgress(null);
      setError(null);
      return;
    }

    const accessToken = getAccessToken();

    if (!accessToken) {
      setError("Missing access token.");
      return;
    }

    const abortController = new AbortController();
    let buffer = "";

    async function connect() {
      try {
        setError(null);
        const response = await fetch(`${environment.apiBaseUrl}/projects/${projectId}/scans/${scanId}/progress`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "text/event-stream",
          },
          signal: abortController.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`Progress stream failed with status ${response.status}.`);
        }

        setIsConnected(true);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (!abortController.signal.aborted) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          buffer = processSseBuffer(buffer, (snapshot) => {
            setProgress(snapshot);

            if (TERMINAL_SCAN_STATUSES.includes(snapshot.status)) {
              abortController.abort();
            }
          });
        }
      } catch (streamError) {
        if (!abortController.signal.aborted) {
          setError(streamError instanceof Error ? streamError.message : "Progress stream failed.");
        }
      } finally {
        setIsConnected(false);
      }
    }

    void connect();

    return () => {
      abortController.abort();
    };
  }, [enabled, projectId, scanId]);

  return {
    progress,
    isConnected,
    error,
  };
}

function processSseBuffer(
  buffer: string,
  onSnapshot: (snapshot: ScanProgressSnapshot) => void,
): string {
  const frames = buffer.split(/\n\n/);
  const remainder = frames.pop() ?? "";

  for (const frame of frames) {
    const data = frame
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.replace(/^data:\s?/, ""))
      .join("\n")
      .trim();

    if (!data) {
      continue;
    }

    try {
      onSnapshot(JSON.parse(data) as ScanProgressSnapshot);
    } catch {
      // Ignore malformed progress frames. The polling query remains the fallback.
    }
  }

  return remainder;
}
