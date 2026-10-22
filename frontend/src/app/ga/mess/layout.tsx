'use client';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ModuleShell, type ModuleShellMenuItem } from '@/components/module-shell/module-shell';
import { getAccessToken,getStoredUser } from '@/lib/access-control';
import styles from './mess.module.css';
const viewers=['ADMIN','SUPER_ADMIN','SECTION_HEAD','PJO'];
export default function MessLayout({children}:{children:ReactNode}){const router=useRouter();const [role,setRole]=useState('');useEffect(()=>{const u=getStoredUser();if(!getAccessToken()||!u){router.replace('/login');return}if(![...viewers,'HOUSE_MAN'].includes(u.role)){router.replace('/ga');return}setRole(u.role)},[router]);const menu=useMemo<ModuleShellMenuItem[]>(()=>role==='HOUSE_MAN'?[{label:'Operasional Houseman',href:'/ga/mess/operasional',initial:'OP'}]:[{label:'Dashboard',href:'/ga/mess/dashboard',initial:'DB'},{label:'Operasional Houseman',href:'/ga/mess/operasional',initial:'OP'}],[role]);if(!role)return <main className={styles.loading}>Memuat Mess...</main>;return <ModuleShell title="Monitoring Kamar" subtitle="General Affairs" deptBadge={{text:'MS',color:'#0f766e',soft:'#e6f7f5'}} menuItems={menu} backHref="/ga" backLabel="Kembali ke GA"><main className={styles.body}>{children}</main></ModuleShell>}
