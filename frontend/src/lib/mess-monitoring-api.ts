import { getAccessToken } from './access-control';
const BASE = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api'}/mess-monitoring`;
export type ShiftMess = 'PAGI' | 'MALAM' | 'CUTI';
export type MessOccupant = { id:number; nrp:string; name:string; shift:ShiftMess };
export type MessCleaning = { id:number; startedAt:string; finishedAt?:string|null; durationSec?:number|null; houseMan:{id:number;name:string;nrp?:string|null} };
export type MessRoom = { id:number; number:string; occupants:MessOccupant[]; cleanliness:'BELUM'|'SUDAH'; activeCleaning:MessCleaning|null; lastCleaning:MessCleaning|null };
async function call<T>(path:string, init?:RequestInit):Promise<T>{ const res=await fetch(`${BASE}${path}`,{...init,headers:{'Content-Type':'application/json',Authorization:`Bearer ${getAccessToken()}`,...init?.headers},cache:'no-store'}); if(!res.ok){const x=await res.json().catch(()=>null);throw new Error(x?.message??'Permintaan gagal');} return res.json(); }
export const messApi={
 dashboard:()=>call<any>('/dashboard'), rooms:()=>call<MessRoom[]>('/rooms'), operations:()=>call<MessRoom[]>('/operations'),
 createRoom:(data:any)=>call('/rooms',{method:'POST',body:JSON.stringify(data)}), updateRoom:(id:number,number:string)=>call(`/rooms/${id}`,{method:'PATCH',body:JSON.stringify({number})}), deleteRoom:(id:number)=>call(`/rooms/${id}`,{method:'DELETE'}),
 addOccupant:(roomId:number,data:any)=>call(`/rooms/${roomId}/occupants`,{method:'POST',body:JSON.stringify(data)}), updateOccupant:(id:number,data:any)=>call(`/occupants/${id}`,{method:'PATCH',body:JSON.stringify(data)}), deleteOccupant:(id:number)=>call(`/occupants/${id}`,{method:'DELETE'}),
 start:(id:number)=>call(`/rooms/${id}/start`,{method:'POST'}), finish:(id:number)=>call(`/rooms/${id}/finish`,{method:'POST'}),
};
