import { redirect } from 'next/navigation';

// ==================================================
// FILE: frontend/src/app/page.tsx
// FUNGSI: Mengarahkan halaman utama ke login
// ==================================================

export default function HomePage() {
  redirect('/login');
}

// ==================================================
// SELESAI
// ==================================================
