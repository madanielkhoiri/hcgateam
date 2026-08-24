"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { epromApi, type Vendor } from "@/lib/eprom-api";
import { FolderExplorer } from "@/components/civil-project/folder-explorer";
import styles from "../../kontrak.module.css";

export default function LegalitasVendorPage() {
  const params = useParams<{ vendorId: string }>();
  const vendorId = Number(params.vendorId);
  const [vendor, setVendor] = useState<Vendor | null>(null);

  useEffect(() => {
    epromApi.vendor.detail(vendorId).then(setVendor).catch(() => setVendor(null));
  }, [vendorId]);

  return (
    <div className={styles.page}>
      <Link href="/civil/project/kontrak/legalitas" className={styles.backLink}>
        <ArrowLeft size={16} /> Kembali ke Legalitas Vendor
      </Link>

      <div>
        <h1 style={{ margin: "0 0 4px", fontSize: 18, color: "#10244a" }}>
          Legalitas Vendor{vendor ? ` - ${vendor.namaVendor}` : ""}
        </h1>
        <p style={{ margin: 0, color: "#7185a0", fontSize: 12 }}>
          SIUP, NPWP, Akta, dan dokumen legalitas lainnya.
        </p>
      </div>

      <div className={styles.panel}>
        <FolderExplorer scope="LEGALITAS_VENDOR" vendorId={vendorId} />
      </div>
    </div>
  );
}
