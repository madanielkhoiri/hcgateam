"use client";

import { useParams } from "next/navigation";
import { EngineerDocumentApproval } from "@/components/eprom/EngineerDocumentApproval";

export default function ChecklistApprovalPage() {
  const params = useParams<{ projectId: string; id: string }>();

  return (
    <EngineerDocumentApproval
      projectId={Number(params.projectId)}
      tipe="checklist-tahapan"
      documentId={Number(params.id)}
    />
  );
}
