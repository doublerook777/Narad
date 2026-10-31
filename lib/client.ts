import type { PlayerSlot, Room } from "./types";

export type RoomView = Room & { serverTime: number };
export interface Seat { slot: PlayerSlot; name: string }

export const seatKey = (code: string) => `narad:${code.toUpperCase()}`;

export function loadSeat(code: string): Seat | null {
  try { return JSON.parse(localStorage.getItem(seatKey(code)) || "null"); } catch { return null; }
}
export function saveSeat(code: string, seat: Seat) {
  localStorage.setItem(seatKey(code), JSON.stringify(seat));
}

export async function post<T = unknown>(url: string, body: unknown): Promise<{ ok: boolean; data: T & { error?: string } }> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}
