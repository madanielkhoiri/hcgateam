"use client";

import { useParams } from "next/navigation";
import { EngineerDocumentApproval } from "@/components/eprom/EngineerDocumentApproval";
import type { TipeEngineer } from "@/lib/eprom-api";

export default function EngineerApprovalPage() {
  const params = useParams<{
    projectId: string;
    tipe: TipeEngineer;
    id: string;
  }>();

  return (
    <EngineerDocumentApproval
      projectId={Number(params.projectId)}
      tipe={params.tipe}
      documentId={Number(params.id)}
    />
  );
}
