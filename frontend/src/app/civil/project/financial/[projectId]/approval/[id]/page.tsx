"use client";

import { useParams } from "next/navigation";
import { EngineerDocumentApproval } from "@/components/eprom/EngineerDocumentApproval";

export default function OpnameApprovalPage() {
  const params = useParams<{ projectId: string; id: string }>();
  return (
    <EngineerDocumentApproval
      projectId={Number(params.projectId)}
      tipe="shop-drawing"
      documentId={Number(params.id)}
      mode="financial"
    />
  );
}
