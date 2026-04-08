"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ApproveButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleApprove = async () => {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch("/api/admin/approve-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Failed to approve user.");
        return;
      }

      setMessage("User approved successfully.");
      router.refresh();
    } catch {
      setMessage("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-approve-wrapper">
      <button
        type="button"
        onClick={handleApprove}
        disabled={loading}
        className="admin-approve-button"
      >
        {loading ? "Approving..." : "Approve User"}
      </button>

      {message && <p className="admin-action-message">{message}</p>}
    </div>
  );
}