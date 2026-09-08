'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { clearSession, formatRole, getStoredUser, type PortalUser } from '@/lib/access-control';
import {
  gudangApi,
  urlFotoGudang,
  type BarangGudang,
  type HasilCheckoutGudang,
  type InventoryScopeGudang,
} from '@/lib/gudang-api';
import styles from './gudang.module.css';

const ROLE_BOLEH_GUDANG = ['GUDANG', 'SECTION_HEAD', 'ADMIN', 'SUPER_ADMIN'];

type Langkah = 'scope' | 'menu' | 'keranjang' | 'konfirmasi' | 'sukses';

const KATEGORI_META: Record<
  string,
  { bg: string; fg: string; label: string }
> = {
  ATK: { bg: '#eaf2ff', fg: '#0868f6', label: 'ATK' },
  HOUSEKEEPING: { bg: '#e8f8ef', fg: '#1f9d55', label: 'Housekeeping' },
  BAJU: { bg: '#fff3e6', fg: '#c2660b', label: 'Baju' },
  ELEKTRONIK: { bg: '#f1eaff', fg: '#7c3aed', label: 'Elektronik' },
  FURNITURE: { bg: '#f7efe6', fg: '#8a5a2b', label: 'Furniture' },
};

const KATEGORI_TAB = [
  { key: 'SEMUA', label: 'Semua' },
  { key: 'ATK', label: 'ATK' },
  { key: 'HOUSEKEEPING', label: 'Housekeeping' },
  { key: 'BAJU', label: 'Baju' },
  { key: 'ELEKTRONIK', label: 'Elektronik' },
  { key: 'FURNITURE', label: 'Furniture' },
];

const DAFTAR_DEPARTEMEN = [
  'HCGA',
  'PRODUKSI',
  'PLANT',
  'ENGINEERING',
  'SHE',
  'ICT MD',
];

const LABEL_SCOPE: Record<InventoryScopeGudang, string> = {
  GENERAL: 'General',
  MESS: 'Mess',
  ELECTRIC: 'Electric',
};

function IkonBarang({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 7.5L12 3l9 4.5-9 4.5-9-4.5z" />
      <path d="M3 7.5v9L12 21l9-4.5v-9" />
      <path d="M12 12v9" />
    </svg>
  );
}

function TileFoto({
  item,
  size,
}: {
  item: Pick<BarangGudang, 'category' | 'photoPath'>;
  size: number;
}) {
  const meta = KATEGORI_META[item.category] ?? KATEGORI_META.ATK;

  if (item.photoPath) {
    return (
      <img
        src={urlFotoGudang(item.photoPath, 'items')}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    );
  }

  return (
    <div style={{ color: meta.fg }}>
      <IkonBarang size={size} />
    </div>
  );
}

function GudangPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<PortalUser | null>(null);
  const [siapDicek, setSiapDicek] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const [langkah, setLangkah] = useState<Langkah>('scope');
  const [scope, setScope] = useState<InventoryScopeGudang | null>(null);

  const [items, setItems] = useState<BarangGudang[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [errorItems, setErrorItems] = useState('');

  const [activeCategory, setActiveCategory] = useState('SEMUA');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<Record<number, number>>({});

  const [nrp, setNrp] = useState('');
  const [taker, setTaker] = useState('');
  const [department, setDepartment] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [hasil, setHasil] = useState<HasilCheckoutGudang | null>(null);
  const [nomorTransaksi, setNomorTransaksi] = useState('');
  const [waktuTransaksi, setWaktuTransaksi] = useState<Date | null>(null);
  const [namaPengambilSukses, setNamaPengambilSukses] = useState('');

  useEffect(() => {
    const stored = getStoredUser();

    if (!stored || !ROLE_BOLEH_GUDANG.includes(stored.role)) {
      router.replace('/dashboard');
      return;
    }

    setUser(stored);
    setTaker(stored.name);
    setSiapDicek(true);

    const scopeAwal = searchParams.get('scope');
    if (scopeAwal === 'GENERAL' || scopeAwal === 'MESS' || scopeAwal === 'ELECTRIC') {
      setScope(scopeAwal);
      setLangkah('menu');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const muatBarang = useCallback(async (scopeDipilih: InventoryScopeGudang) => {
    setLoadingItems(true);
    setErrorItems('');

    try {
      const data = await gudangApi.daftarBarang(scopeDipilih);
      setItems(data);
    } catch (err) {
      setErrorItems(err instanceof Error ? err.message : 'Gagal memuat daftar barang');
    } finally {
      setLoadingItems(false);
    }
  }, []);

  useEffect(() => {
    if (scope && langkah === 'menu') {
      void muatBarang(scope);
    }
  }, [scope, langkah, muatBarang]);

  function logout() {
    clearSession();
    router.replace('/login');
    router.refresh();
  }

  function pilihScope(nilai: InventoryScopeGudang) {
    setScope(nilai);
    setActiveCategory('SEMUA');
    setSearch('');
    setLangkah('menu');
  }

  function ubahQty(itemId: number, delta: number, stok: number) {
    setCart((current) => {
      const sekarang = current[itemId] ?? 0;
      let berikutnya = sekarang + delta;
      if (berikutnya < 0) berikutnya = 0;
      if (berikutnya > stok) berikutnya = stok;

      const salinan = { ...current };
      if (berikutnya === 0) {
        delete salinan[itemId];
      } else {
        salinan[itemId] = berikutnya;
      }
      return salinan;
    });
  }

  function hapusDariKeranjang(itemId: number) {
    setCart((current) => {
      const salinan = { ...current };
      delete salinan[itemId];
      return salinan;
    });
  }

  const itemTampil = useMemo(() => {
    const kata = search.trim().toLowerCase();

    return items.filter((item) => {
      if (activeCategory !== 'SEMUA' && item.category !== activeCategory) {
        return false;
      }

      if (kata && !item.name.toLowerCase().includes(kata)) {
        return false;
      }

      return true;
    });
  }, [items, activeCategory, search]);

  const itemById = useMemo(() => {
    const map = new Map<number, BarangGudang>();
    items.forEach((item) => map.set(item.id, item));
    return map;
  }, [items]);

  const totalCart = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const barisKeranjang = Object.entries(cart)
    .map(([id, qty]) => ({ item: itemById.get(Number(id)), qty }))
    .filter((baris): baris is { item: BarangGudang; qty: number } => Boolean(baris.item));

  async function submitCheckout() {
    if (!scope) return;

    setSubmitting(true);
    setSubmitError('');

    const namaPengambil = nrp.trim() ? `${nrp.trim()} - ${taker.trim()}` : taker.trim();

    try {
      const hasilCheckout = await gudangApi.checkout({
        scope,
        taker: namaPengambil,
        department,
        items: barisKeranjang.map(({ item, qty }) => ({ itemId: item.id, quantity: qty })),
      });

      const waktu = new Date();
      const idAcuan = hasilCheckout.transaksi[0]?.id ?? Math.floor(Math.random() * 9000 + 1000);
      const tanggalRingkas = `${String(waktu.getFullYear()).slice(2)}${String(waktu.getMonth() + 1).padStart(2, '0')}${String(waktu.getDate()).padStart(2, '0')}`;

      setHasil(hasilCheckout);
      setNamaPengambilSukses(namaPengambil);
      setWaktuTransaksi(waktu);
      setNomorTransaksi(`SO-${tanggalRingkas}-${String(idAcuan).padStart(4, '0')}`);
      setLangkah('sukses');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Checkout gagal, coba lagi');
    } finally {
      setSubmitting(false);
    }
  }

  function mulaiLagi() {
    setCart({});
    setHasil(null);
    setSubmitError('');
    setLangkah('menu');
  }

  function BackButton({ onClick }: { onClick: () => void }) {
    return (
      <button type="button" className={styles.backButton} onClick={onClick} aria-label="Kembali">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#10244a" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
    );
  }

  function ProfileMenu() {
    return (
      <div className={styles.profileWrapper}>
        <button
          type="button"
          className={styles.avatar}
          onClick={() => setProfileMenuOpen((current) => !current)}
          aria-expanded={profileMenuOpen}
          aria-label="Menu profil"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="3.4" />
            <path d="M5 20c1.2-3.6 4-5.4 7-5.4s5.8 1.8 7 5.4" />
          </svg>
        </button>

        {profileMenuOpen && (
          <>
            <button
              type="button"
              className={styles.menuBackdrop}
              aria-label="Tutup menu profil"
              onClick={() => setProfileMenuOpen(false)}
            />

            <div className={styles.profileMenu}>
              <div className={styles.profileMenuHeader}>
                <div className={styles.avatar} style={{ cursor: 'default' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="3.4" />
                    <path d="M5 20c1.2-3.6 4-5.4 7-5.4s5.8 1.8 7 5.4" />
                  </svg>
                </div>
                <div>
                  <strong>{user?.name}</strong>
                  <span>{formatRole(user?.role)}</span>
                </div>
              </div>

              <div className={styles.profileMenuDivider} />

              <button type="button" className={styles.logoutButton} onClick={logout}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#c4708a" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                  <path d="M16 17l5-5-5-5" />
                  <path d="M21 12H9" />
                </svg>
                <span>
                  <strong>Keluar</strong>
                  <small>Kembali ke halaman login</small>
                </span>
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  if (!siapDicek) {
    return (
      <div className={styles.shell}>
        <div className={styles.center}>Memuat...</div>
      </div>
    );
  }

  // ---------- Langkah: pilih lingkup ----------
  if (langkah === 'scope') {
    return (
      <div className={styles.shell}>
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.headerLeft}>
              <BackButton onClick={() => router.replace('/dashboard')} />
              <div>
                <div className={styles.eyebrow}>Modul Gudang</div>
                <div className={styles.title}>Pilih lingkup gudang</div>
              </div>
            </div>
            <ProfileMenu />
          </div>
        </div>

        <div className={styles.listArea}>
          {(['GENERAL', 'MESS', 'ELECTRIC'] as InventoryScopeGudang[]).map((nilai) => (
            <button
              key={nilai}
              type="button"
              onClick={() => pilihScope(nilai)}
              className={styles.lineCard}
              style={{ cursor: 'pointer', textAlign: 'left', border: 'none', width: '100%' }}
            >
              <div className={styles.lineTile} style={{ background: '#eaf2ff', color: '#0868f6' }}>
                <IkonBarang size={26} />
              </div>
              <div className={styles.lineInfo}>
                <div className={styles.lineName}>{LABEL_SCOPE[nilai]}</div>
              </div>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#9aa8bf" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ---------- Langkah: menu ----------
  if (langkah === 'menu') {
    return (
      <div className={styles.shell}>
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.headerLeft}>
              <BackButton onClick={() => setLangkah('scope')} />
              <div>
                <div className={styles.eyebrow}>Gudang · {scope ? LABEL_SCOPE[scope] : ''}</div>
                <div className={styles.title}>Ambil Barang</div>
              </div>
            </div>
            <ProfileMenu />
          </div>

          <label className={styles.searchBox}>
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#8c9bb2" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari barang..."
            />
          </label>
        </div>

        <div className={styles.tabs}>
          {KATEGORI_TAB.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              className={`${styles.tabChip} ${activeCategory === cat.key ? styles.tabChipActive : ''}`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className={styles.itemCount}>
          {loadingItems ? 'Memuat barang...' : `${itemTampil.length} barang`}
        </div>

        {errorItems && <p className={styles.errorText}>{errorItems}</p>}

        <div className={styles.grid}>
          {itemTampil.map((item) => {
            const meta = KATEGORI_META[item.category] ?? KATEGORI_META.ATK;
            const qty = cart[item.id] ?? 0;
            const habis = item.stock <= 0;
            const rendah = !habis && item.stock <= 8;
            const stockColor = habis ? '#d64545' : rendah ? '#b7791f' : '#1f9d55';
            const stockLabel = habis ? 'Stok habis' : `Stok: ${item.stock} ${item.unit}`;

            return (
              <div
                key={item.id}
                className={`${styles.card} ${qty > 0 ? styles.cardSelected : ''} ${habis ? styles.cardDisabled : ''}`}
              >
                <div className={styles.tile} style={{ background: item.photoPath ? '#eef2f8' : meta.bg }}>
                  <TileFoto item={item} size={56} />
                  {!item.photoPath && <span className={styles.tileCaption}>Foto belum ada</span>}
                  {habis && <div className={styles.tileOverlay} />}
                </div>

                <div className={styles.cardBody}>
                  <span className={styles.categoryBadge} style={{ background: meta.bg, color: meta.fg }}>
                    {meta.label}
                  </span>
                  <div className={styles.itemName}>{item.name}</div>
                  <div className={styles.stockRow}>
                    <span className={styles.stockDot} style={{ background: stockColor }} />
                    <span className={styles.stockLabel} style={{ color: stockColor }}>{stockLabel}</span>
                  </div>

                  {habis ? (
                    <div className={styles.unavailable}>Tidak tersedia</div>
                  ) : (
                    <div className={styles.stepper}>
                      <button
                        type="button"
                        className={styles.stepperButton}
                        onClick={() => ubahQty(item.id, -1, item.stock)}
                        disabled={qty === 0}
                        aria-label={`Kurangi ${item.name}`}
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={qty === 0 ? '#c3cede' : '#0868f6'} strokeWidth={2.6} strokeLinecap="round"><path d="M5 12h14" /></svg>
                      </button>
                      <span className={styles.stepperQty}>{qty}</span>
                      <button
                        type="button"
                        className={`${styles.stepperButton} ${styles.stepperButtonPrimary}`}
                        onClick={() => ubahQty(item.id, 1, item.stock)}
                        aria-label={`Tambah ${item.name}`}
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#ffffff" strokeWidth={2.6} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {totalCart > 0 && (
          <button type="button" className={styles.cartBar} onClick={() => setLangkah('keranjang')}>
            <div className={styles.cartBarLeft}>
              <div className={styles.cartIconWrap}>
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 4h2l2.4 12.2a2 2 0 002 1.8h8.2a2 2 0 002-1.6L21 8H6" />
                  <circle cx="9" cy="20" r="1.3" fill="#ffffff" stroke="none" />
                  <circle cx="17" cy="20" r="1.3" fill="#ffffff" stroke="none" />
                </svg>
              </div>
              <div>
                <div className={styles.cartBarSub}>{totalCart} item dipilih</div>
                <div className={styles.cartBarMain}>Lihat Keranjang</div>
              </div>
            </div>
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#ffffff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  // ---------- Langkah: keranjang ----------
  if (langkah === 'keranjang') {
    return (
      <div className={styles.shell}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <BackButton onClick={() => setLangkah('menu')} />
            <div>
              <div className={styles.title}>Keranjang</div>
              <div className={styles.footerHint}>
                {barisKeranjang.length} jenis barang · {totalCart} total item
              </div>
            </div>
          </div>
        </div>

        {barisKeranjang.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.successIcon} style={{ background: '#eaf2ff' }}>
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#0868f6" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 4h2l2.4 12.2a2 2 0 002 1.8h8.2a2 2 0 002-1.6L21 8H6" />
                <circle cx="9" cy="20" r="1.4" />
                <circle cx="17" cy="20" r="1.4" />
              </svg>
            </div>
            <div>
              <div className={styles.itemName} style={{ fontSize: 16 }}>Keranjang masih kosong</div>
              <div className={styles.footerHint} style={{ marginTop: 6 }}>
                Kembali ke menu untuk mulai memilih barang.
              </div>
            </div>
            <button type="button" className={styles.primaryButton} onClick={() => setLangkah('menu')}>
              Kembali ke Menu
            </button>
          </div>
        ) : (
          <>
            <div className={styles.listArea}>
              {barisKeranjang.map(({ item, qty }) => {
                const meta = KATEGORI_META[item.category] ?? KATEGORI_META.ATK;

                return (
                  <div key={item.id} className={styles.lineCard}>
                    <div className={styles.lineTile} style={{ background: meta.bg, color: meta.fg }}>
                      <TileFoto item={item} size={22} />
                    </div>
                    <div className={styles.lineInfo}>
                      <div className={styles.lineName}>{item.name}</div>
                      <button type="button" className={styles.removeButton} onClick={() => hapusDariKeranjang(item.id)}>
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#c4708a" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 6h16M8 6V4h8v2M6 6l1 14h10l1-14" />
                        </svg>
                        <span>Hapus</span>
                      </button>
                    </div>
                    <div className={styles.stepper} style={{ marginTop: 0, flexShrink: 0 }}>
                      <button type="button" className={styles.stepperButton} onClick={() => ubahQty(item.id, -1, item.stock)} aria-label={`Kurangi ${item.name}`}>
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#0868f6" strokeWidth={2.6} strokeLinecap="round"><path d="M5 12h14" /></svg>
                      </button>
                      <span className={styles.stepperQty}>{qty}</span>
                      <button type="button" className={`${styles.stepperButton} ${styles.stepperButtonPrimary}`} onClick={() => ubahQty(item.id, 1, item.stock)} aria-label={`Tambah ${item.name}`}>
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#ffffff" strokeWidth={2.6} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                      </button>
                    </div>
                  </div>
                );
              })}

              <button type="button" className={styles.addMoreLink} onClick={() => setLangkah('menu')}>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#0868f6" strokeWidth={2.4} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                Tambah barang lain
              </button>
            </div>

            <div className={styles.footer}>
              <span className={styles.footerHint}>
                Total {barisKeranjang.length} jenis · {totalCart} item
              </span>
              <button type="button" className={styles.primaryButton} onClick={() => setLangkah('konfirmasi')}>
                Lanjut ke Konfirmasi
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ---------- Langkah: konfirmasi ----------
  if (langkah === 'konfirmasi') {
    return (
      <div className={styles.shell}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <BackButton onClick={() => setLangkah('keranjang')} />
            <div>
              <div className={styles.title}>Konfirmasi Pengambilan</div>
              <div className={styles.footerHint}>Lengkapi data sebelum dikirim</div>
            </div>
          </div>
        </div>

        <div className={styles.listArea}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryTitle}>Ringkasan barang</div>
            {barisKeranjang.map(({ item, qty }) => (
              <div key={item.id} className={styles.summaryLine}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: '#10244a' }}>{item.name}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#0868f6' }}>{qty} {item.unit}</span>
              </div>
            ))}
            <div className={styles.summaryTotal}>
              <span className={styles.footerHint}>Total {barisKeranjang.length} jenis barang</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#10244a' }}>{totalCart} item</span>
            </div>
          </div>

          <div className={styles.form}>
            <div className={styles.field}>
              <label>NRP</label>
              <input className={styles.input} value={nrp} onChange={(event) => setNrp(event.target.value)} placeholder="Contoh: 12345" />
            </div>

            <div className={styles.field}>
              <label>Nama pengambil *</label>
              <input className={styles.input} value={taker} onChange={(event) => setTaker(event.target.value)} placeholder="Nama lengkap" />
            </div>

            <div className={styles.field}>
              <label>Departemen / Site *</label>
              <select className={styles.input} value={department} onChange={(event) => setDepartment(event.target.value)}>
                <option value="">Pilih departemen...</option>
                {DAFTAR_DEPARTEMEN.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>

          {submitError && <p className={styles.errorText}>{submitError}</p>}
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.primaryButton} onClick={() => void submitCheckout()} disabled={submitting}>
            {submitting ? 'Mengirim...' : 'Konfirmasi & Kirim'}
          </button>
        </div>
      </div>
    );
  }

  // ---------- Langkah: sukses ----------
  return (
    <div className={styles.shell}>
      <div className={styles.listArea} style={{ alignItems: 'center', textAlign: 'center' }}>
        <div className={styles.successIcon}>
          <svg viewBox="0 0 24 24" width="46" height="46" fill="none" stroke="#1f9d55" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <div className={styles.successTitle}>Barang berhasil diambil!</div>
        <div className={styles.successSub}>
          Transaksi barang keluar sudah tercatat di sistem gudang {scope ? LABEL_SCOPE[scope] : ''}.
        </div>

        {hasil && (
          <div className={styles.summaryCard} style={{ width: '100%', textAlign: 'left', marginTop: 10 }}>
            <div className={styles.summaryLine}>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: '#9aa8bf', textTransform: 'uppercase', letterSpacing: '0.04em' }}>No. Transaksi</span>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: '#10244a' }}>{nomorTransaksi}</span>
            </div>
            <div className={styles.summaryLine}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#10244a' }}>Pengambil</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#6f819d' }}>{namaPengambilSukses}</span>
            </div>
            <div className={styles.summaryLine}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#10244a' }}>Waktu</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#6f819d' }}>
                {waktuTransaksi?.toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className={styles.summaryTitle} style={{ marginTop: 10 }}>Ringkasan barang</div>
            {hasil.transaksi.map((baris) => (
              <div key={baris.id} className={styles.summaryLine}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#10244a' }}>{baris.namaBarang}</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#6f819d' }}>{baris.quantity} {baris.unit}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <button type="button" className={styles.primaryButton} onClick={mulaiLagi}>
          Ambil Barang Lagi
        </button>
        <button
          type="button"
          className={styles.ghostButton}
          onClick={() => {
            if (user?.role === 'GUDANG') {
              router.replace('/gudang');
            } else {
              router.replace('/ga/inventory/barang-keluar');
            }
          }}
        >
          Selesai
        </button>
      </div>
    </div>
  );
}

export default function GudangPage() {
  return (
    <Suspense fallback={<div className={styles.shell}><div className={styles.center}>Memuat...</div></div>}>
      <GudangPageInner />
    </Suspense>
  );
}
