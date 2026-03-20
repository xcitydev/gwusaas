"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OutreachResultsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/outreach");
  }, [router]);

  return null;
}
