import { getAccessToken } from './access-control';
const BASE = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api'}/mess-monitoring`;
export type ShiftMess = 'PAGI' | 'MALAM' | 'CUTI';
export type MessOccupant = { id:number; nrp:string; name:string; shift:ShiftMess };
export type MessCleaning = { id:number; startedAt:string; finishedAt?:string|null; durationSec?:number|null; status?:'DIBERSIHKAN'|'TIDAK_DIBERSIHKAN'; alasan?:string|null; houseMan:{id:number;name:string;nrp?:string|null} };
export type MessRoom = { id:number; building:string; number:string; occupants:MessOccupant[]; cleanliness:'BELUM'|'SUDAH'|'TIDAK_DIBERSIHKAN'; activeCleaning:MessCleaning|null; lastCleaning:MessCleaning|null };
export type MessRoomCatalogBuilding = { value:string; label:string; floors:Array<{value:string;label:string;rooms:string[]}> };
export type MessRecapSession = MessCleaning & { day:string; room:{id:number;building:string;number:string} };
export type MessRecap = { from:string; to:string; days:number; totalRooms:number; roomsByBuilding:Record<string,number>; rooms:Array<{id:number;building:string;number:string}>; sessions:MessRecapSession[] };
export type MessTrend = { from:string; to:string; days:number; totalRooms:number; daily:Array<{ day:string; sudah:number; tidak:number; proses:number; belum:number; rataRataDetik:number|null; petugas:number }> };
async function call<T>(path:string, init?:RequestInit):Promise<T>{ const res=await fetch(`${BASE}${path}`,{...init,headers:{'Content-Type':'application/json',Authorization:`Bearer ${getAccessToken()}`,...init?.headers},cache:'no-store'}); if(!res.ok){const x=await res.json().catch(()=>null);throw new Error(x?.message??'Permintaan gagal');} return res.json(); }
export const messApi={
 dashboard:()=>call<any>('/dashboard'), trend:(from:string,to:string)=>call<MessTrend>(`/trend?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`), recap:(from:string,to:string)=>call<MessRecap>(`/recap?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`), catalog:()=>call<MessRoomCatalogBuilding[]>('/catalog'), rooms:()=>call<MessRoom[]>('/rooms'), operations:()=>call<MessRoom[]>('/operations'),
 createRoom:(data:any)=>call('/rooms',{method:'POST',body:JSON.stringify(data)}), updateRoom:(id:number,building:string,number:string)=>call(`/rooms/${id}`,{method:'PATCH',body:JSON.stringify({building,number})}), deleteRoom:(id:number)=>call(`/rooms/${id}`,{method:'DELETE'}),
 addOccupant:(roomId:number,data:any)=>call(`/rooms/${roomId}/occupants`,{method:'POST',body:JSON.stringify(data)}), updateOccupant:(id:number,data:any)=>call(`/occupants/${id}`,{method:'PATCH',body:JSON.stringify(data)}), deleteOccupant:(id:number)=>call(`/occupants/${id}`,{method:'DELETE'}),
 start:(id:number)=>call(`/rooms/${id}/start`,{method:'POST'}), skip:(id:number,alasan:string)=>call(`/rooms/${id}/skip`,{method:'POST',body:JSON.stringify({alasan})}), finish:(id:number)=>call(`/rooms/${id}/finish`,{method:'POST'}),
};
