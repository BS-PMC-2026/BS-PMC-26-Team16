"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Action = "approve" | "delete" | "reset";

export default function ApproveButton({ userId, email }: { userId: string; email: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<Action | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  async function callRoute(path: string, body: Record<string, string>, action: Action) {
    try {
      setLoading(action);
      setMessage(null);
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!res.ok) {
        setMessage({ text: result.error || "Action failed.", error: true });
        return;
      }
      const successText: Record<Action, string> = {
        approve: "User approved successfully.",
        delete: "User deleted successfully.",
        reset: "Password reset email sent.",
      };
      setMessage({ text: successText[action], error: false });
      if (action !== "reset") router.refresh();
    } catch {
      setMessage({ text: "Something went wrong.", error: true });
    } finally {
      setLoading(null);
    }
  }

  const busy = loading !== null;

  return (
    <div className="admin-approve-wrapper">
      <div className="admin-action-buttons">
        <button
          type="button"
          onClick={() => callRoute("/admin/approve-user", { userId }, "approve")}
          disabled={busy}
          className="admin-approve-button"
        >
          {loading === "approve" ? "Approving..." : "Approve"}
        </button>

        <button
          type="button"
          onClick={() => callRoute("/admin/reset-password", { email }, "reset")}
          disabled={busy}
          className="admin-reset-button"
        >
          {loading === "reset" ? "Sending..." : "Reset Password"}
        </button>

        <button
          type="button"
          disabled={busy}
          className="admin-delete-button"
          onClick={() => {
            if (
              !confirm(
                `Delete user ${email}? This permanently removes their account and cannot be undone.`
              )
            )
              return;
            callRoute("/admin/delete-user", { userId }, "delete");
          }}
        >
          {loading === "delete" ? "Deleting..." : "Delete"}
        </button>
      </div>

      {message && (
        <p
          className={
            message.error ? "admin-action-message admin-action-error" : "admin-action-message"
          }
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
