import {
  Airport,
  Aircraft,
  RouteNetworkItem,
  SimulationResult,
  DisruptionInput,
  RecoveryRecommendation,
  RecoveryComparison,
  DominoExplanation
} from '../types';
import {
  FALLBACK_AIRPORTS,
  FALLBACK_ROUTES,
  FALLBACK_BASELINE_SIM,
  FALLBACK_MUMBAI_SIM
} from './fallbackData';

const envApi = (import.meta as any).env?.VITE_API_URL;
const API_BASE = (envApi || '/api').replace(/\/$/, '');

// --- AUTHENTICATION & RBAC STATE MANAGEMENT ---
export interface AuthUser {
  id: number;
  email: string;
  full_name: string;
  role: 'ADMIN' | 'DISPATCHER' | 'ANALYST' | 'VIEWER';
}

const ACCESS_TOKEN_KEY = 'domino_sky_access_token';
const REFRESH_TOKEN_KEY = 'domino_sky_refresh_token';
const USER_KEY = 'domino_sky_user';

export function getStoredToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  const data = localStorage.getItem(USER_KEY);
  return data ? JSON.parse(data) : null;
}

export function setStoredAuth(access: string, refresh: string, user: AuthUser) {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredAuth() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function getAuthHeaders(): HeadersInit {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Authentication failed' }));
    throw new Error(err.detail || 'Login failed');
  }
  const data = await res.json();
  const user: AuthUser = {
    id: data.user.id,
    email: data.user.email,
    full_name: data.user.full_name,
    role: data.user.role,
  };
  setStoredAuth(data.access_token, data.refresh_token, user);
  return user;
}

export async function loginAsRole(role: 'ADMIN' | 'DISPATCHER' | 'ANALYST' | 'VIEWER'): Promise<AuthUser> {
  const credentials: Record<string, { email: string; pass: string }> = {
    ADMIN: { email: 'admin@dominosky.aoc', pass: 'Admin@DominoSky2026!' },
    DISPATCHER: { email: 'dispatcher@dominosky.aoc', pass: 'Dispatch@DominoSky2026!' },
    ANALYST: { email: 'analyst@dominosky.aoc', pass: 'Analyst@DominoSky2026!' },
    VIEWER: { email: 'viewer@dominosky.aoc', pass: 'Viewer@DominoSky2026!' },
  };
  const cred = credentials[role];
  return login(cred.email, cred.pass);
}

export async function ensureAuthenticated(): Promise<AuthUser> {
  const existingUser = getStoredUser();
  const existingToken = getStoredToken();
  if (existingUser && existingToken) {
    return existingUser;
  }
  return loginAsRole('DISPATCHER');
}

export async function fetchAirports(): Promise<Airport[]> {
  try {
    const res = await fetch(`${API_BASE}/network/airports`, { headers: getAuthHeaders() });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (err) {
    console.warn('Network airports fetch failed, using instant fallback:', err);
  }
  return FALLBACK_AIRPORTS;
}

export async function fetchAircraft(): Promise<Aircraft[]> {
  try {
    const res = await fetch(`${API_BASE}/network/aircraft`, { headers: getAuthHeaders() });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Network aircraft fetch failed:', err);
  }
  return [];
}

export async function fetchRoutes(): Promise<RouteNetworkItem[]> {
  try {
    const res = await fetch(`${API_BASE}/network/routes`, { headers: getAuthHeaders() });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (err) {
    console.warn('Network routes fetch failed, using instant fallback:', err);
  }
  return FALLBACK_ROUTES;
}

export async function runSimulation(disruption: DisruptionInput): Promise<SimulationResult> {
  try {
    await ensureAuthenticated();
    const res = await fetch(`${API_BASE}/simulation/run`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(disruption),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Simulation API failed, using instant deterministic result:', err);
  }
  return FALLBACK_MUMBAI_SIM;
}

export async function resetSimulation(): Promise<SimulationResult> {
  try {
    await ensureAuthenticated();
    const res = await fetch(`${API_BASE}/simulation/reset`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Simulation reset API failed, using instant baseline:', err);
  }
  return FALLBACK_BASELINE_SIM;
}

export async function fetchLatestSimulation(): Promise<SimulationResult> {
  try {
    const res = await fetch(`${API_BASE}/simulation/latest`, { headers: getAuthHeaders() });
    if (res.ok) {
      const data = await res.json();
      if (data && data.metrics) return data;
    }
  } catch (err) {
    console.warn('Simulation latest fetch failed, using instant baseline:', err);
  }
  return FALLBACK_BASELINE_SIM;
}

export async function fetchSimulationResult(simId: string): Promise<SimulationResult> {
  const res = await fetch(`${API_BASE}/simulation/results/${simId}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`Failed to load simulation ${simId}`);
  return res.json();
}

export async function fetchSimulationHistory(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/simulation/history`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to load simulation history');
  return res.json();
}

export async function fetchDominoExplanation(simId: string): Promise<DominoExplanation> {
  const res = await fetch(`${API_BASE}/simulation/domino-explanation/${simId}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to load domino explanation');
  return res.json();
}

export async function fetchRecommendations(simId?: string): Promise<RecoveryRecommendation[]> {
  const url = simId ? `${API_BASE}/recovery/recommend?simulation_id=${simId}` : `${API_BASE}/recovery/recommend`;
  const res = await fetch(url, { method: 'POST', headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to generate recovery recommendations');
  return res.json();
}

export async function previewRecovery(simId: string, candidateId: string): Promise<any> {
  await ensureAuthenticated();
  const res = await fetch(`${API_BASE}/recovery/preview`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ simulation_id: simId, candidate_id: candidateId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to preview recovery strategy' }));
    throw new Error(err.detail || 'Failed to preview recovery strategy');
  }
  return res.json();
}

export async function applyRecovery(simId: string, candidateId: string): Promise<RecoveryComparison> {
  await ensureAuthenticated();
  const res = await fetch(`${API_BASE}/recovery/apply`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ simulation_id: simId, candidate_id: candidateId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to apply recovery strategy' }));
    throw new Error(err.detail || 'Failed to apply recovery strategy');
  }
  return res.json();
}

export function getExportJsonUrl(simId?: string): string {
  return simId ? `${API_BASE}/export/json?simulation_id=${simId}` : `${API_BASE}/export/json`;
}

export function getExportCsvUrl(simId?: string): string {
  return simId ? `${API_BASE}/export/csv?simulation_id=${simId}` : `${API_BASE}/export/csv`;
}
