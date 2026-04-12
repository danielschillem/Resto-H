"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FormationsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/super-admin");
  }, [router]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", color: "#64748b", fontFamily: "Inter, sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 24, marginBottom: 12, display: "block" }} />
        Redirection…
      </div>
    </div>
  );
}
