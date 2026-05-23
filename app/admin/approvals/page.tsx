import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ApproveButton from "./ApproveButton";
import "./AdminApprovals.css";

type SearchParams = Promise<{
  from?: string;
  to?: string;
  range?: string;
  search?: string;
}>;

export default async function AdminApprovalsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: currentProfile, error: currentProfileError } = await supabase
    .from("profiles")
    .select("user_type, is_approved")
    .eq("id", user.id)
    .single();

  if (
    currentProfileError ||
    !currentProfile ||
    currentProfile.user_type !== "admin" ||
    currentProfile.is_approved !== true
  ) {
    redirect("/");
  }

  const range = params.range || "";
  const search = params.search?.trim() || "";

  let fromDate = params.from || "";
  let toDate = params.to || "";

  const now = new Date();

  if (range === "today") {
    const today = now.toISOString().split("T")[0];
    fromDate = today;
    toDate = today;
  }

  if (range === "7days") {
    const past = new Date();
    past.setDate(now.getDate() - 7);
    fromDate = past.toISOString().split("T")[0];
    toDate = now.toISOString().split("T")[0];
  }

  if (range === "30days") {
    const past = new Date();
    past.setDate(now.getDate() - 30);
    fromDate = past.toISOString().split("T")[0];
    toDate = now.toISOString().split("T")[0];
  }

  let query = supabase
    .from("profiles")
    .select(
      "id, first_name, last_name, email, phone, id_number, user_type, request_reason, created_at, is_approved"
    )
    .eq("is_approved", false)
    .order("created_at", { ascending: false });

  if (fromDate) {
    query = query.gte("created_at", `${fromDate}T00:00:00`);
  }

  if (toDate) {
    query = query.lte("created_at", `${toDate}T23:59:59`);
  }

  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,id_number.ilike.%${search}%`
    );
  }

  const { data: users, error } = await query;
  const pendingCount = users?.length ?? 0;

  return (
    <div className="admin-approvals-page">
      <div className="admin-approvals-background-glow-one" />
      <div className="admin-approvals-background-glow-two" />

      <div className="admin-approvals-card">
        <div className="admin-approvals-header">
          <div className="admin-approvals-badge">Admin Panel</div>
          <h1 className="admin-approvals-title">Pending User Approvals</h1>
          <p className="admin-approvals-subtitle">
            Review user requests, search users, filter by date, and approve
            accounts.
          </p>
        </div>

        <div className="admin-approvals-summary">
          <div className="admin-summary-card">
            <span className="admin-summary-label">Pending requests</span>
            <strong className="admin-summary-value">{pendingCount}</strong>
          </div>
          <div className="admin-summary-card">
            <span className="admin-summary-label">Access level</span>
            <strong className="admin-summary-value">Approved Admin</strong>
          </div>
          <div className="admin-summary-card">
            <span className="admin-summary-label">Review mode</span>
            <strong className="admin-summary-value">Live filters</strong>
          </div>
        </div>

        <form method="GET" className="admin-filter-form">
          <div className="admin-filter-field admin-filter-field-search">
            <label className="admin-filter-label">Search User</label>
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search by name, email, phone, or ID number"
              className="admin-filter-input"
            />
          </div>

          <div className="admin-filter-field">
            <label className="admin-filter-label">Quick Filter</label>
            <select
              name="range"
              defaultValue={range}
              className="admin-filter-input"
            >
              <option value="">All Time</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          <div className="admin-filter-field">
            <label className="admin-filter-label">From</label>
            <input
              type="date"
              name="from"
              defaultValue={params.from || ""}
              className="admin-filter-input"
            />
          </div>

          <div className="admin-filter-field">
            <label className="admin-filter-label">To</label>
            <input
              type="date"
              name="to"
              defaultValue={params.to || ""}
              className="admin-filter-input"
            />
          </div>

          <div className="admin-filter-actions">
            <button type="submit" className="admin-filter-button">
              Apply Filters
            </button>
            <a href="/admin/approvals" className="admin-clear-button">
              Clear
            </a>
          </div>
        </form>

        {error && (
          <div className="admin-error-box">
            Failed to load users: {error.message}
          </div>
        )}

        {!error && (!users || users.length === 0) && (
          <div className="admin-empty-box">
            No pending users found for the selected filters.
          </div>
        )}

        {!error && users && users.length > 0 && (
          <div className="admin-approvals-list">
            {users.map((user) => (
              <div key={user.id} className="admin-user-card">
                <div className="admin-user-top">
                  <div>
                    <div className="admin-user-heading-row">
                      <h2 className="admin-user-name">
                        {user.first_name} {user.last_name}
                      </h2>
                      <span className="admin-user-role-pill">{user.user_type}</span>
                    </div>
                    <p className="admin-user-meta">{user.email}</p>
                  </div>

                  <div className="admin-created-at">
                    Created:{" "}
                    {user.created_at
                      ? new Date(user.created_at).toLocaleString()
                      : "Unknown"}
                  </div>
                </div>

                <div className="admin-user-grid">
                  <div className="admin-info-box">
                    <span className="admin-info-label">Phone</span>
                    <span className="admin-info-value">{user.phone || "-"}</span>
                  </div>

                  <div className="admin-info-box">
                    <span className="admin-info-label">ID Number</span>
                    <span className="admin-info-value">{user.id_number || "-"}</span>
                  </div>

                  <div className="admin-info-box">
                    <span className="admin-info-label">Email</span>
                    <span className="admin-info-value">{user.email}</span>
                  </div>

                  <div className="admin-info-box">
                    <span className="admin-info-label">Account Type</span>
                    <span className="admin-info-value">{user.user_type}</span>
                  </div>
                </div>

                <div className="admin-reason-box">
                  <p className="admin-reason-title">Request Reason</p>
                  <p className="admin-reason-text">
                    {user.request_reason?.trim()
                      ? user.request_reason
                      : "No reason was provided."}
                  </p>
                </div>

                <div className="admin-user-actions">
                  <ApproveButton userId={user.id} email={user.email ?? ''} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
