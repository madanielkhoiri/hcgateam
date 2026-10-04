"use client";
import { formatBulanSingkat } from "@/lib/eprom-api";
type Titik = { bulan: string; planned: number; actual: number; deviasi: number };
type Seri = { id: number; namaProject: string; data: Titik[] };
const W=720,H=270,L=42,R=64,T=24,B=48,ORANYE="#ef7100",BIRU="#0868f6";
export function ProgressTrendChart({ seri }: { seri: Seri[] }) {
  const tanggal=Array.from(new Set(seri.flatMap(s=>s.data.map(d=>d.bulan)))).sort();
  if(!tanggal.length) return null;
  const nilai=seri.flatMap(s=>s.data.flatMap(d=>[d.planned,d.actual]));
  const maxNilai=Math.max(...nilai,1); const maxY=maxNilai<=25?25:Math.min(100,Math.ceil(maxNilai*1.2/5)*5);
  const width=Math.max(W,tanggal.length*82), aw=width-L-R, ah=H-T-B;
  const x=(v:string)=>tanggal.length===1?L+aw/2:L+tanggal.indexOf(v)/(tanggal.length-1)*aw;
  const y=(v:number)=>T+ah-Math.min(maxY,Math.max(0,v))/maxY*ah;
  const ticks=Array.from({length:5},(_,i)=>Math.round(maxY*i/4));
  const path=(d:Titik[],k:"planned"|"actual")=>d.map(a=>`${x(a.bulan)},${y(a[k])}`).join(" ");
  return <div style={{width:"100%",overflowX:"auto"}}><svg viewBox={`0 0 ${width} ${H}`} style={{width,height:H,minWidth:420,display:"block"}}>
    {ticks.map(p=><g key={p}><line x1={L} x2={width-R} y1={y(p)} y2={y(p)} stroke="#dbe6f2" strokeDasharray={p?"5 7":undefined}/><text x={L-9} y={y(p)+4} textAnchor="end" fontSize={10} fill="#71839a">{p}%</text></g>)}
    {tanggal.map(t=><text key={t} x={x(t)} y={H-14} textAnchor="middle" fontSize={10} fill="#71839a">{formatBulanSingkat(t)}</text>)}
    {seri.map(s=><g key={s.id}><polyline points={path(s.data,"planned")} fill="none" stroke={ORANYE} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"/><polyline points={path(s.data,"actual")} fill="none" stroke={BIRU} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"/>{s.data.map(d=>{const mid=(d.planned+d.actual)/2;return <g key={d.bulan}><circle cx={x(d.bulan)} cy={y(d.planned)} r={4} fill={ORANYE} stroke="white" strokeWidth={2}/><circle cx={x(d.bulan)} cy={y(d.actual)} r={4} fill={BIRU} stroke="white" strokeWidth={2}/><text x={x(d.bulan)} y={y(mid)-8} textAnchor="middle" fontSize={10} fontWeight={700} fill={d.deviasi>=0?"#078b49":"#d53535"} stroke="white" strokeWidth={4} paintOrder="stroke">{d.deviasi>=0?"+":""}{d.deviasi}%</text></g>})}</g>)}
  </svg><div style={{display:"flex",flexWrap:"wrap",gap:16,marginTop:8,fontSize:12,color:"#34506f"}}><span><i style={{display:"inline-block",width:10,height:10,borderRadius:99,background:ORANYE,marginRight:6}}/>Planned</span><span><i style={{display:"inline-block",width:10,height:10,borderRadius:99,background:BIRU,marginRight:6}}/>Actual</span>{seri.map(s=><span key={s.id}>• {s.namaProject}</span>)}</div></div>;
}
