import type { AuthSession } from "@/types/auth";

type SessionListener = (session: AuthSession | null) => void;

let accessToken: string | null = null;
let currentSession: AuthSession | null = null;
const listeners = new Set<SessionListener>();

export function getAccessToken(): string | null {
  return accessToken;
}

export function getAuthSession(): AuthSession | null {
  return currentSession;
}

export function setAuthSession(session: AuthSession): void {
  currentSession = session;
  accessToken = session.accessToken;
  notifySessionListeners();
}

export function clearAuthSession(): void {
  currentSession = null;
  accessToken = null;
  notifySessionListeners();
}

export function subscribeToAuthSession(listener: SessionListener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function notifySessionListeners(): void {
  listeners.forEach((listener) => listener(currentSession));
}

