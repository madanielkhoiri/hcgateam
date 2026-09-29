import { getAccessToken } from './access-control';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

function toUint8Array(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

export async function aktifkanWebPush(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) throw new Error('Browser ini belum mendukung notifikasi web.');
  const token = getAccessToken();
  if (!token) throw new Error('Sesi login tidak ditemukan.');
  const izin = await Notification.requestPermission();
  if (izin !== 'granted') throw new Error('Izin notifikasi belum diberikan.');
  const registration = await navigator.serviceWorker.register('/service-worker.js');
  const keyResponse = await fetch(`${API_URL}/web-push/public-key`, { headers: { Authorization: `Bearer ${token}` } });
  const { publicKey } = await keyResponse.json();
  const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toUint8Array(publicKey) });
  await fetch(`${API_URL}/web-push/subscribe`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(subscription.toJSON()) });
}
