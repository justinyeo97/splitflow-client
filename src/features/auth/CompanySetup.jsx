import ProximityHeading from "../../components/ProximityHeading.jsx";
import { apiRequest } from "../../api/client.js";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider.jsx";

export default function CompanySetup({ embedded = false }) {
  const { invitationsEnabled, profile } = useAuth();
  return invitationsEnabled || profile?.role === "unassigned" ? (
    <InvitedCompanySetup embedded={embedded} />
  ) : (
    <LegacyCompanySetup />
  );
}

function LegacyCompanySetup() {
  const { saveCompany, signOut } = useAuth();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Enter your company name.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await saveCompany(name);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <div className="auth-panel">
        <p className="eyebrow">YOUR WORKSPACE</p>
        <ProximityHeading as="h1">
          Which company do you manage?
        </ProximityHeading>
        <p className="auth-intro">
          Add your company name to complete your account.
        </p>
        {error && (
          <div className="auth-alert" role="alert">
            {error}
          </div>
        )}
        <form className="auth-form" onSubmit={submit}>
          <label>
            Company name
            <input
              autoComplete="organization"
              required
              maxLength={200}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <button className="primary-button" disabled={busy}>
            {busy ? "Saving…" : "Continue to workspace"}
          </button>
        </form>
        <button className="text-button" onClick={signOut} disabled={busy}>
          Sign out
        </button>
      </div>
    </main>
  );
}

function InvitedCompanySetup({ embedded }) {
  const { session, joinCompany, signOut, user } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let current = true;
    setLoading(true);
    setError("");
    apiRequest("auth/companies", { token: session.access_token })
      .then((result) => {
        if (current) {
          setCompanies(result.data);
          setSelected(
            result.data.length === 1 ? result.data[0].company_id : "",
          );
        }
      })
      .catch((err) => {
        if (current) setError(err.message);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [session.access_token, reload]);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await joinCompany(selected);
      navigate("/expenses", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className={embedded ? "page-content" : "auth-page"}>
      <div className="auth-panel">
        <p className="eyebrow">YOUR TEAM</p>
        <ProximityHeading as="h1">Choose your company</ProximityHeading>
        <p className="auth-intro">
          Only companies that invited your verified email are listed.
        </p>
        {error && (
          <div className="auth-alert" role="alert">
            {error}
          </div>
        )}
        {loading ? (
          <p role="status">Loading your invitations...</p>
        ) : companies.length ? (
          <form className="auth-form" onSubmit={submit}>
            <label>
              Company
              <select
                required
                value={selected}
                disabled={busy}
                onChange={(e) => setSelected(e.target.value)}
              >
                <option value="">Select a company</option>
                {companies.map((company) => (
                  <option key={company.company_id} value={company.company_id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="primary-button" disabled={busy || !selected}>
              {busy ? "Joining..." : "Continue"}
            </button>
          </form>
        ) : (
          <p className="auth-intro">
            {user?.email_confirmed_at
              ? "No invitations were found. Ask your company administrator to add " +
                user.email +
                " to your consultant record."
              : "Verify your email, then sign in again to view your invitations."}
          </p>
        )}
        <button
          className="text-button"
          disabled={busy || loading}
          onClick={() => setReload((n) => n + 1)}
        >
          Refresh invitations
        </button>
        <button className="text-button" disabled={busy} onClick={signOut}>
          Sign out
        </button>
      </div>
    </main>
  );
}
