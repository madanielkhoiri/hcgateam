"use client";

import Link from "next/link";
import { ChevronDown, KeyRound, LogOut, ScrollText, UserCog, UsersRound } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { clearSession, formatRole, type PortalUser } from "@/lib/access-control";
import styles from "./profile-menu.module.css";

export function ProfileMenu({ user }: { user: PortalUser }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const close = () => setOpen(false);
  const canManage = user.role === "ADMIN" || user.role === "SUPER_ADMIN" || user.role === "SECTION_HEAD";

  return <div className={styles.wrapper}>
    <button type="button" className={styles.trigger} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <span className={styles.avatar}><UsersRound size={22} /></span>
      <span className={styles.identity}><strong>{user.name}</strong><small>{user.jabatan || formatRole(user.role)}</small></span>
      <ChevronDown size={17} className={open ? styles.arrowOpen : styles.arrow} />
    </button>
    {open && <div className={styles.menu} role="menu">
      <div className={styles.menuHeader}><span className={styles.menuAvatar}><UsersRound size={22} /></span><span><strong>{user.name}</strong><small>{user.jabatan || formatRole(user.role)}</small></span></div>
      <div className={styles.divider} />
      <Link href="/dashboard" onClick={close}><UserCog size={18} /><span><strong>Akun Saya</strong><small>Edit nama dan username</small></span></Link>
      {canManage && <Link href="/admin/manajemen-akun" onClick={close}><UsersRound size={18} /><span><strong>Manajemen Akun</strong><small>Atur role dan akses menu akun</small></span></Link>}
      {canManage && <Link href="/admin/audit-log" onClick={close}><ScrollText size={18} /><span><strong>Audit Log</strong><small>Riwayat siapa mengubah apa</small></span></Link>}
      <Link href="/dashboard" onClick={close}><KeyRound size={18} /><span><strong>Ubah Password</strong><small>Perbarui keamanan akun</small></span></Link>
      <div className={styles.divider} />
      <button type="button" className={styles.logout} onClick={() => { clearSession(); router.replace('/login'); }}><LogOut size={18} /><span><strong>Keluar</strong><small>Kembali ke halaman login</small></span></button>
    </div>}
  </div>;
}
