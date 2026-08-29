'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import { Dialog } from '@/components/mcu/mcu-ui';
import { urlFotoKip, type KipChecklistBulan } from '@/lib/kip-api';

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export function KipDetailBulan({
  baris,
  onTutup,
}: {
  baris: KipChecklistBulan;
  onTutup: () => void;
}) {
  return (
    <Dialog
      judul={`Bukti Inspeksi — ${NAMA_BULAN[baris.bulan - 1]}`}
      keterangan={
        baris.tanggalPeriksa
          ? `Diperiksa oleh ${baris.pemeriksa?.name ?? '-'} pada ${new Date(baris.tanggalPeriksa).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`
          : undefined
      }
      onTutup={onTutup}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {baris.fotoBukti && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={urlFotoKip(baris.fotoBukti)}
            alt="Foto dokumentasi bukti inspeksi"
            style={{ width: '100%', maxHeight: 320, objectFit: 'contain', borderRadius: 10, background: '#f1f5f9' }}
          />
        )}

        {baris.parameterCeklis && baris.parameterCeklis.length > 0 && (
          <div>
            <strong style={{ fontSize: 12.5, color: '#12355f' }}>Checklist Parameter Inspeksi</strong>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {baris.parameterCeklis.map((item, index) => (
                <div key={index} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12.5 }}>
                  {item.checked ? (
                    <CheckCircle2 size={16} color="#07984c" style={{ flexShrink: 0, marginTop: 1 }} />
                  ) : (
                    <XCircle size={16} color="#d53535" style={{ flexShrink: 0, marginTop: 1 }} />
                  )}
                  <span style={{ color: '#385675' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!baris.fotoBukti && !baris.parameterCeklis && (
          <p style={{ color: '#71839d', fontSize: 12.5 }}>
            Belum ada detail bukti inspeksi untuk bulan ini (dicatat sebelum fitur ini ada).
          </p>
        )}
      </div>
    </Dialog>
  );
}
