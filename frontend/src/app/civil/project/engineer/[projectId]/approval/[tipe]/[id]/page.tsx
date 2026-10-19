"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { EngineerDocumentApproval } from "@/components/eprom/EngineerDocumentApproval";
import type { TipeEngineer } from "@/lib/eprom-api";

export default function EngineerApprovalPage() {
  const router = useRouter();
  const params = useParams<{
    projectId: string;
    tipe: TipeEngineer;
    id: string;
  }>();

  const tanpaApprovalCoret = [
    "sertifikasi-pekerjaan",
    "peralatan-list",
    "komisioning-alat-berat",
  ].includes(params.tipe);

  useEffect(() => {
    if (tanpaApprovalCoret) {
      router.replace(
        `/civil/project/engineer/${params.projectId}?tab=${params.tipe}`,
      );
    }
  }, [params.projectId, params.tipe, router, tanpaApprovalCoret]);

  if (tanpaApprovalCoret) return null;

  return (
    <EngineerDocumentApproval
      projectId={Number(params.projectId)}
      tipe={params.tipe}
      documentId={Number(params.id)}
    />
  );
}
