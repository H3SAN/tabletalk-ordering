// Customer guest session — long random ID stored in localStorage per QR/table.
// Used as a "secret" that ties a guest to their orders for tracking.

function randomId(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function getCustomerSessionId(qrToken: string): string {
  if (typeof window === "undefined") return randomId();
  const key = `cust_session_${qrToken}`;
  let id = localStorage.getItem(key);
  if (!id) {
    id = randomId();
    localStorage.setItem(key, id);
  }
  return id;
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

export function formatPrice(n: number | string): string {
  const num = typeof n === "string" ? parseFloat(n) : n;
  return num.toFixed(2);
}