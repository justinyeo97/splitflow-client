import ProximityHeading from "../../components/ProximityHeading.jsx";
import { useState } from "react";
import { useAuth } from "../auth/AuthProvider.jsx";
import { apiRequest } from "../../api/client.js";
import { useApiList } from "../../hooks/useApiList.js";
import {
  today,
  expenseCurrencies,
  money,
  useToken,
  Heading,
  Notice,
  Panel,
  ListResult,
} from "./operationsUi.jsx";

const emptyForm = () => ({
  consultant_id: "",
  placement_date: today(),
  client: "",
  country_id: "",
  revenue_amount: "",
  revenue_currency: "USD",
  revenue_recognition_date: today(),
});

export default function PlacementsPage() {
  const token = useToken();
  const { profile } = useAuth();
  const canDelete = ["administrator", "finance"].includes(profile?.role);
  const [deleting, setDeleting] = useState(null);
  const placements = useApiList("placements", token);
  const consultants = useApiList("consultants", token, 100);
  const countries = useApiList("countries", token, 100);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const byId = Object.fromEntries(
    consultants.data.map((person) => [person.id, person]),
  );
  const countryById = Object.fromEntries(
    countries.data.map((country) => [country.id, country]),
  );
  const change = (field, value) =>
    setForm((previous) => ({ ...previous, [field]: value }));
  function reset() {
    setEditing(null);
    setForm(emptyForm());
  }
  function edit(row) {
    setEditing(row.id);
    setError("");
    setNotice("");
    setForm({
      consultant_id: row.consultant_id,
      placement_date: row.placement_date,
      client: row.client || "",
      country_id: row.country_id || "",
      revenue_amount:
        row.revenue_amount == null ? "" : String(row.revenue_amount),
      revenue_currency: row.revenue_currency?.trim() || "USD",
      revenue_recognition_date:
        row.revenue_recognition_date || row.placement_date,
    });
  }
  async function deletePlacement(row) {
    if (
      !window.confirm(
        `Delete placement ${row.external_id}? Its revenue will be removed from reports. This cannot be undone.`,
      )
    )
      return;
    setDeleting(row.id);
    setError("");
    setNotice("");
    try {
      await apiRequest(`placements/${row.id}`, { method: "DELETE", token });
      if (editing === row.id) reset();
      setNotice(
        "Placement deleted. Its revenue is no longer included in reports.",
      );
      if (placements.data.length === 1 && placements.offset > 0)
        placements.setOffset(
          Math.max(0, placements.offset - placements.pagination.limit),
        );
      else placements.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  }
  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await apiRequest(editing ? `placements/${editing}` : "placements", {
        method: editing ? "PATCH" : "POST",
        token,
        body: { ...form, client: form.client.trim() || null },
      });
      setNotice(
        editing
          ? "Placement updated. Revenue is included in the ROI report."
          : "Placement created. Revenue is included in the ROI report.",
      );
      reset();
      placements.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="page-content">
      <Heading eyebrow="FINANCE" title="Placements" />
      <p className="page-lede">
        Record placement revenue for monthly country ROI. Enter zero only when
        no revenue was earned.
      </p>
      <Notice
        error={error || consultants.error?.message || countries.error?.message}
        notice={notice}
      />
      <div className="management-grid">
        <section className="panel form-panel">
          <div className="panel-heading">
            <div>
              <ProximityHeading as="h2">
                {editing ? "Edit placement" : "Add a placement"}
              </ProximityHeading>
              <p>Record the fee and the date it is recognized as revenue.</p>
            </div>
          </div>
          <form className="record-form" onSubmit={submit}>
            <p className="form-footnote">
              Placement ID is generated automatically.
            </p>
            <label>
              Consultant
              <select
                required
                value={form.consultant_id}
                onChange={(e) => change("consultant_id", e.target.value)}
              >
                <option value="">Select consultant</option>
                {form.consultant_id && !byId[form.consultant_id] && (
                  <option value={form.consultant_id}>Current consultant</option>
                )}
                {consultants.data.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name} ({person.external_id})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Placement date
              <input
                type="date"
                required
                value={form.placement_date}
                onChange={(e) => change("placement_date", e.target.value)}
              />
            </label>
            <label>
              Client (optional)
              <input
                maxLength="200"
                value={form.client}
                onChange={(e) => change("client", e.target.value)}
              />
            </label>
            <label>
              Revenue country
              <select
                required
                value={form.country_id}
                onChange={(e) => change("country_id", e.target.value)}
              >
                <option value="">Select country</option>
                {form.country_id && !countryById[form.country_id] && (
                  <option value={form.country_id}>Current country</option>
                )}
                {countries.data.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-row">
              <label>
                Placement revenue
                <input
                  type="number"
                  required
                  min="0"
                  max="99999999999999.99999999"
                  step="0.00000001"
                  value={form.revenue_amount}
                  onChange={(e) => change("revenue_amount", e.target.value)}
                />
              </label>
              <label>
                Currency
                <select
                  required
                  value={form.revenue_currency}
                  onChange={(e) => change("revenue_currency", e.target.value)}
                >
                  {[...new Set([...expenseCurrencies, form.revenue_currency])]
                    .sort()
                    .map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <label>
              Revenue recognition date
              <input
                type="date"
                required
                value={form.revenue_recognition_date}
                onChange={(e) =>
                  change("revenue_recognition_date", e.target.value)
                }
              />
            </label>
            <p className="form-footnote">
              Revenue is reported in this month using the historical USD rate on
              this date. Country costs use their expense transaction dates.
            </p>
            <div className="form-actions">
              {editing && (
                <button
                  type="button"
                  className="secondary-action"
                  disabled={saving || Boolean(deleting)}
                  onClick={reset}
                >
                  Cancel
                </button>
              )}
              <button
                className="primary-button"
                disabled={
                  saving ||
                  Boolean(deleting) ||
                  consultants.loading ||
                  countries.loading
                }
              >
                {saving
                  ? "Saving…"
                  : editing
                    ? "Save placement"
                    : "Create placement"}
              </button>
            </div>
          </form>
        </section>
        <Panel
          title="Placement records"
          detail={`${placements.pagination.total} total`}
          action={
            <button
              className="secondary-action"
              onClick={placements.refresh}
              disabled={placements.loading}
            >
              Refresh
            </button>
          }
        >
          <ListResult
            list={placements}
            title="Could not load placements"
            columns={[
              "Placement ID",
              "Consultant",
              "Placement date",
              "Client",
              "Country",
              "Revenue",
              "Recognized",
              "Actions",
            ]}
          >
            {placements.data.map((row) => (
              <tr key={row.id}>
                <td className="primary-cell">{row.external_id}</td>
                <td>{byId[row.consultant_id]?.name || "—"}</td>
                <td>{row.placement_date}</td>
                <td>{row.client || "—"}</td>
                <td>{countryById[row.country_id]?.name || "Unassigned"}</td>
                <td>
                  {row.revenue_amount == null
                    ? "Revenue missing"
                    : money(row.revenue_amount, row.revenue_currency)}
                </td>
                <td>{row.revenue_recognition_date || "—"}</td>
                <td>
                  <button
                    className="row-action"
                    disabled={saving || Boolean(deleting)}
                    onClick={() => edit(row)}
                  >
                    Edit
                  </button>{" "}
                  {canDelete && (
                    <button
                      type="button"
                      className="row-action"
                      disabled={saving || Boolean(deleting)}
                      onClick={() => deletePlacement(row)}
                    >
                      {deleting === row.id ? "Deleting..." : "Delete"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </ListResult>
        </Panel>
      </div>
    </section>
  );
}
