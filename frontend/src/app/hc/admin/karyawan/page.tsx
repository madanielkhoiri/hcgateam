"use client";

import {
    ArrowLeft,
    CheckCircle2,
    Plus,
    RefreshCw,
    Search,
    UserCog,
    XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

/* <--- fitur manajemen akun karyawan / FA / Admin ---> */

type RolePengguna = "SUPER_ADMIN" | "FA" | "KARYAWAN";

type DataPenggunaTersimpan = {
    id: number;
    nrp: string;
    nama: string;
    email: string;
    nomor_telepon: string;
    role: RolePengguna;
    kode_tiket?: string;
};

type DataPengguna = {
    id: number;
    nrp: string;
    nama: string;
    email: string | null;
    nomor_telepon: string | null;
    role: RolePengguna;
    aktif: boolean;
    kode_tiket: string;
    dibuat_pada?: string;
    diperbarui_pada?: string;
};

type FormAkun = {
    nrp: string;
    nama: string;
    email: string;
    nomor_telepon: string;
    kata_sandi: string;
    role: RolePengguna;
};

const formAwal: FormAkun = {
    nrp: "",
    nama: "",
    email: "",
    nomor_telepon: "",
    kata_sandi: "",
    role: "KARYAWAN",
};

export default function HalamanKelolaKaryawan() {
    const router = useRouter();
    const apiUrl = process.env.NEXT_PUBLIC_DEKLARASI_API_URL || "http://localhost:3011";

    const [daftarPengguna, setDaftarPengguna] = useState<DataPengguna[]>([]);
    const [sedangMemuat, setSedangMemuat] = useState(true);
    const [sedangRefresh, setSedangRefresh] = useState(false);
    const [sedangSimpan, setSedangSimpan] = useState(false);
    const [pesanError, setPesanError] = useState("");
    const [pesanSukses, setPesanSukses] = useState("");

    const [kataKunci, setKataKunci] = useState("");
    const [filterRole, setFilterRole] = useState("SEMUA");
    const [tampilkanForm, setTampilkanForm] = useState(false);
    const [formAkun, setFormAkun] = useState<FormAkun>(formAwal);

    const apakahAdmin = (role: string) => {
        return role === "SUPER_ADMIN" || role === "FA";
    };

    const formatRole = (role: string) => {
        if (role === "SUPER_ADMIN") return "Admin";
        if (role === "FA") return "FA";
        if (role === "KARYAWAN") return "Karyawan";

        return role;
    };

    const ambilDataPengguna = async () => {
        setPesanError("");
        setSedangRefresh(true);

        try {
            const response = await fetch(`${apiUrl}/pengguna`);

            if (!response.ok) {
                throw new Error("Gagal mengambil data akun");
            }

            const data = await response.json();
            setDaftarPengguna(Array.isArray(data) ? data : []);
        } catch (error) {
            setPesanError(
                error instanceof Error
                    ? error.message
                    : "Terjadi kesalahan mengambil data akun"
            );
        } finally {
            setSedangMemuat(false);
            setSedangRefresh(false);
        }
    };

    useEffect(() => {
        const token = (localStorage.getItem("hcga_access_token") || sessionStorage.getItem("hcga_access_token"));
        const dataPengguna = (localStorage.getItem("hcga_user") || sessionStorage.getItem("hcga_user"));

        if (!token || !dataPengguna) {
            router.replace("/");
            return;
        }

        let penggunaTersimpan: DataPenggunaTersimpan;

        try {
            penggunaTersimpan = ((p: any) => ({ ...p, nama: p.nama || p.name, nrp: p.nrp || p.username }))(JSON.parse(dataPengguna));
        } catch {
            localStorage.removeItem("hcga_access_token");
            localStorage.removeItem("hcga_user");
            router.replace("/");
            return;
        }

        if (!apakahAdmin(penggunaTersimpan.role)) {
            router.replace("/hc");
            return;
        }

        ambilDataPengguna();
    }, [apiUrl, router]);

    const daftarTersaring = useMemo(() => {
        const keyword = kataKunci.toLowerCase();

        return daftarPengguna.filter((pengguna) => {
            const cocokKataKunci =
                pengguna.nama?.toLowerCase().includes(keyword) ||
                pengguna.nrp?.toLowerCase().includes(keyword) ||
                pengguna.email?.toLowerCase().includes(keyword) ||
                pengguna.nomor_telepon?.toLowerCase().includes(keyword) ||
                pengguna.kode_tiket?.toLowerCase().includes(keyword) ||
                formatRole(pengguna.role).toLowerCase().includes(keyword);

            const cocokRole = filterRole === "SEMUA" || pengguna.role === filterRole;

            return cocokKataKunci && cocokRole;
        });
    }, [daftarPengguna, kataKunci, filterRole]);

    const ubahForm = (field: keyof FormAkun, value: string) => {
        setFormAkun((sebelumnya) => ({
            ...sebelumnya,
            [field]: value,
        }));
    };

    const simpanAkun = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setPesanError("");
        setPesanSukses("");
        setSedangSimpan(true);

        try {
            const nrp = formAkun.nrp.trim();
            const nama = formAkun.nama.trim();
            const email = formAkun.email.trim();
            const nomorTelepon = formAkun.nomor_telepon.trim();
            const kataSandi = formAkun.kata_sandi.trim();
            const roleDipilih = formAkun.role;

            if (!nrp || !nama || !kataSandi) {
                throw new Error("NRP, nama, dan kata sandi wajib diisi.");
            }

            const response = await fetch(`${apiUrl}/pengguna`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    nrp,
                    nama,
                    email: email || null,
                    nomor_telepon: nomorTelepon || null,
                    kata_sandi: kataSandi,
                    role: roleDipilih,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || "Gagal membuat akun");
            }

            setPesanSukses(`Akun ${formatRole(roleDipilih)} berhasil dibuat.`);
            setFormAkun(formAwal);
            setTampilkanForm(false);
            await ambilDataPengguna();
        } catch (error) {
            setPesanError(
                error instanceof Error ? error.message : "Terjadi kesalahan membuat akun"
            );
        } finally {
            setSedangSimpan(false);
        }
    };

    const ubahStatusAktif = async (pengguna: DataPengguna) => {
        setPesanError("");
        setPesanSukses("");

        try {
            const response = await fetch(`${apiUrl}/pengguna/${pengguna.id}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    aktif: !pengguna.aktif,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || "Gagal mengubah status akun");
            }

            setPesanSukses(
                pengguna.aktif
                    ? "Akun berhasil dinonaktifkan."
                    : "Akun berhasil diaktifkan."
            );

            await ambilDataPengguna();
        } catch (error) {
            setPesanError(
                error instanceof Error
                    ? error.message
                    : "Terjadi kesalahan mengubah status akun"
            );
        }
    };

    if (sedangMemuat) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
                <div className="rounded-2xl border border-red-100 bg-white px-6 py-4 text-sm font-semibold text-slate-600 shadow-lg">
                    Memuat data akun...
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen overflow-x-hidden bg-slate-50 px-4 pb-10 pt-5 md:px-8">
            <section className="mx-auto w-full max-w-6xl">
                <button
                    type="button"
                    onClick={() => router.push("/hc/admin")}
                    className="mb-5 inline-flex items-center gap-2 rounded-2xl border border-red-100 bg-white px-4 py-2 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Kembali ke Dashboard Admin
                </button>

                <div className="relative overflow-hidden rounded-[34px] bg-gradient-to-br from-red-700 via-red-600 to-rose-500 px-5 py-7 text-white shadow-[0_18px_60px_rgba(220,38,38,0.22)] md:px-8 md:py-8">
                    <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10" />
                    <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-white/10" />

                    <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-bold uppercase tracking-wide">
                                <UserCog className="h-4 w-4" />
                                Kelola Akun
                            </div>

                            <h1 className="mt-4 text-3xl font-black md:text-4xl">
                                Manajemen Akun
                            </h1>

                            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/85">
                                kelola status aktif akun pengguna sistem deklarasi.
                            </p>
                        </div>

                        <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
                            <button
                                type="button"
                                onClick={ambilDataPengguna}
                                disabled={sedangRefresh}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white/20 backdrop-blur-md border border-white/20 px-5 py-3 text-sm font-bold !text-white transition hover:bg-white/30 disabled:cursor-not-allowed md:w-auto"
                            >
                                <RefreshCw
                                    className={`h-4 w-4 ${sedangRefresh ? "animate-spin" : ""}`}
                                />
                                Refresh
                            </button>

                            <button
                                type="button"
                                onClick={() => setTampilkanForm((nilai) => !nilai)}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white/20 backdrop-blur-md border border-white/20 px-5 py-3 text-sm font-bold !text-white transition hover:bg-white/30 md:w-auto"
                            >
                                <Plus className="h-4 w-4" />
                                Tambah Akun
                            </button>
                        </div>
                    </div>
                </div>

                {pesanError && (
                    <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                        {pesanError}
                    </div>
                )}

                {pesanSukses && (
                    <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                        {pesanSukses}
                    </div>
                )}

                {tampilkanForm && (
                    <div className="mt-6 rounded-[32px] border border-red-100 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] md:p-6">
                        <div className="mb-5 flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                                <Plus className="h-6 w-6" />
                            </div>

                            <div>
                                <div className="text-2xl font-black text-slate-900">
                                    Tambah Akun
                                </div>
                                <div className="mt-1 text-sm font-semibold text-slate-500">
                                    Input data akun pengguna baru.
                                </div>
                            </div>
                        </div>

                        <form onSubmit={simpanAkun} className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-xs font-bold text-slate-500">
                                    NRP / Username
                                </label>
                                <input
                                    type="text"
                                    value={formAkun.nrp}
                                    onChange={(event) => ubahForm("nrp", event.target.value)}
                                    placeholder="Contoh: 250013"
                                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-50"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-xs font-bold text-slate-500">
                                    Nama
                                </label>
                                <input
                                    type="text"
                                    value={formAkun.nama}
                                    onChange={(event) => ubahForm("nama", event.target.value)}
                                    placeholder="Contoh: Andi Pratama"
                                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-50"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-xs font-bold text-slate-500">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={formAkun.email}
                                    onChange={(event) => ubahForm("email", event.target.value)}
                                    placeholder="Contoh: andi@email.com"
                                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-50"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-xs font-bold text-slate-500">
                                    Nomor Telepon
                                </label>
                                <input
                                    type="text"
                                    value={formAkun.nomor_telepon}
                                    onChange={(event) =>
                                        ubahForm("nomor_telepon", event.target.value)
                                    }
                                    placeholder="Contoh: 6281234567890"
                                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-50"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-xs font-bold text-slate-500">
                                    Kata Sandi
                                </label>
                                <input
                                    type="password"
                                    value={formAkun.kata_sandi}
                                    onChange={(event) =>
                                        ubahForm("kata_sandi", event.target.value)
                                    }
                                    placeholder="Masukkan kata sandi"
                                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-50"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-xs font-bold text-slate-500">
                                    Role
                                </label>
                                <select
                                    value={formAkun.role}
                                    onChange={(event) =>
                                        ubahForm("role", event.target.value as RolePengguna)
                                    }
                                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-50"
                                >
                                    <option value="KARYAWAN">Karyawan</option>
                                    <option value="FA">FA</option>
                                    <option value="SUPER_ADMIN">Admin</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-3 md:col-span-2 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTampilkanForm(false);
                                        setFormAkun(formAwal);
                                    }}
                                    className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
                                >
                                    Batal
                                </button>

                                <button
                                    type="submit"
                                    disabled={sedangSimpan}
                                    className="inline-flex w-full items-center justify-center rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-red-200 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
                                >
                                    {sedangSimpan ? "Menyimpan..." : "Simpan Akun"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="mt-6 rounded-[32px] border border-red-100 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] md:p-6">
                    <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <div className="text-2xl font-black text-slate-900">
                                Daftar Akun
                            </div>
                            <div className="mt-1 text-sm font-semibold text-slate-500">
                                Total tampil: {daftarTersaring.length} akun
                            </div>
                        </div>

                        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-[620px]">
                            <div>
                                <label className="mb-2 block text-xs font-bold text-slate-500">
                                    Cari akun
                                </label>

                                <div className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 transition focus-within:border-red-400 focus-within:ring-4 focus-within:ring-red-50">
                                    <Search className="h-4 w-4 shrink-0 text-slate-400" />

                                    <input
                                        type="text"
                                        value={kataKunci}
                                        onChange={(event) => setKataKunci(event.target.value)}
                                        placeholder="Cari nama / NRP / email / role"
                                        className="h-full w-full min-w-0 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-xs font-bold text-slate-500">
                                    Filter role
                                </label>

                                <select
                                    value={filterRole}
                                    onChange={(event) => setFilterRole(event.target.value)}
                                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-50"
                                >
                                    <option value="SEMUA">Semua Role</option>
                                    <option value="SUPER_ADMIN">Admin</option>
                                    <option value="FA">FA</option>
                                    <option value="KARYAWAN">Karyawan</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {daftarTersaring.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-red-200 bg-red-50/60 px-4 py-6 text-center text-sm font-semibold text-slate-500">
                                Data akun belum tersedia.
                            </div>
                        ) : (
                            daftarTersaring.map((pengguna) => (
                                <div
                                    key={pengguna.id}
                                    className="rounded-3xl border border-slate-100 bg-slate-50 p-5"
                                >
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                        <div className="min-w-0">
                                            <div className="text-lg font-black leading-6 text-slate-900">
                                                {pengguna.nama || "-"}
                                            </div>

                                            <div className="mt-3 flex flex-col gap-1 text-sm font-semibold text-slate-600 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
                                                <span>NRP: {pengguna.nrp || "-"}</span>
                                                <span className="hidden sm:inline">•</span>
                                                <span>{pengguna.email || "Email belum diisi"}</span>
                                                <span className="hidden sm:inline">•</span>
                                                <span>{pengguna.nomor_telepon || "-"}</span>
                                            </div>

                                            <div className="mt-3 text-sm font-semibold text-slate-500">
                                                Kode Tiket:{" "}
                                                <span className="font-black text-slate-700">
                                                    {pengguna.kode_tiket || "-"}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap lg:w-auto lg:items-center lg:justify-end">
                                            <div className="inline-flex w-full items-center justify-center rounded-2xl bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 sm:w-auto">
                                                {formatRole(pengguna.role)}
                                            </div>

                                            <div
                                                className={`inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-black sm:w-auto ${pengguna.aktif
                                                        ? "bg-emerald-50 text-emerald-700"
                                                        : "bg-slate-100 text-slate-600"
                                                    }`}
                                            >
                                                {pengguna.aktif ? "AKTIF" : "NONAKTIF"}
                                            </div>

                                            {pengguna.role !== "FA" &&
                                                pengguna.role !== "SUPER_ADMIN" && (
                                                    <button
                                                        type="button"
                                                        onClick={() => ubahStatusAktif(pengguna)}
                                                        className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold shadow-lg transition sm:w-auto ${pengguna.aktif
                                                                ? "bg-red-600 text-white shadow-red-200 hover:bg-red-700"
                                                                : "bg-emerald-600 text-white shadow-emerald-200 hover:bg-emerald-700"
                                                            }`}
                                                    >
                                                        {pengguna.aktif ? (
                                                            <>
                                                                <XCircle className="h-4 w-4" />
                                                                Nonaktifkan
                                                            </>
                                                        ) : (
                                                            <>
                                                                <CheckCircle2 className="h-4 w-4" />
                                                                Aktifkan
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </section>
        </main>
    );
}

/* <--- end ---> */