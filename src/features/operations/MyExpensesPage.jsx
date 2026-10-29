import { useState } from "react";
import { useApiList } from "../../hooks/useApiList.js";
import { useAuth } from "../auth/AuthProvider.jsx";
import { Heading, Panel, ListResult, money } from "./operationsUi.jsx";

export default function MyExpensesPage() {
  const { session, profile } = useAuth();
  const [range, setRange] = useState({ from: "", to: "" });
  const [filters, setFilters] = useState({ from: "", to: "" });
  const [error, setError] = useState("");
  const query = new URLSearchParams(
    Object.entries(filters).filter(([, value]) => value),
  ).toString();
  const expenses = useApiList("expenses?" + query, session?.access_token);
  const countries = useApiList("countries", session?.access_token, 100);
  const countryMap = Object.fromEntries(
    countries.data.map((country) => [country.id, country]),
  );
  function apply(event) {
    event.preventDefault();
    if (range.from && range.to && range.from > range.to) {
      setError("Start date must be on or before end date.");
      return;
    }
    setError("");
    expenses.setOffset(0);
    setFilters({ ...range });
  }
  return (
    <section className="page-content">
      <Heading eyebrow="MY WORKSPACE" title="My expenses" />
      <p className="page-lede">
        Expenses recorded for {profile?.consultant?.name || "you"}. Contact your
        finance team for corrections.
      </p>
      {error && (
        <div className="inline-error" role="alert">
          {error}
        </div>
      )}
      <Panel
        title="Expense records"
        detail={`${expenses.pagination.total} total`}
        action={
          <button
            className="secondary-action"
            onClick={expenses.refresh}
            disabled={expenses.loading}
          >
            Refresh
          </button>
        }
      >
        <form className="expense-toolbar" onSubmit={apply}>
          <label>
            From
            <input
              type="date"
              value={range.from}
              onChange={(e) => setRange({ ...range, from: e.target.value })}
            />
          </label>
          <label>
            Through
            <input
              type="date"
              value={range.to}
              onChange={(e) => setRange({ ...range, to: e.target.value })}
            />
          </label>
          <button className="secondary-action">Apply dates</button>
          <button
            type="button"
            className="secondary-action"
            onClick={() => {
              setRange({ from: "", to: "" });
              setFilters({ from: "", to: "" });
              expenses.setOffset(0);
              setError("");
            }}
          >
            Clear
          </button>
        </form>
        <ListResult
          preserveHeight
          list={expenses}
          title="Could not load your expenses"
          columns={[
            "Date",
            "Country",
            "Category",
            "Vendor",
            "Description",
            "Original amount",
            "Regional amount",
          ]}
        >
          {expenses.data.map((expense) => {
            const country = countryMap[expense.attributed_country_id];
            const conversion = expense.expense_conversions?.find(
              (c) =>
                c.target_currency.trim() ===
                country?.default_reporting_currency?.trim(),
            );
            return (
              <tr key={expense.id}>
                <td>{expense.transaction_date}</td>
                <td>{country?.name || "Not available"}</td>
                <td>{expense.category}</td>
                <td>{expense.vendor || "-"}</td>
                <td>{expense.description || "-"}</td>
                <td>
                  {money(expense.original_amount, expense.original_currency)}
                </td>
                <td>
                  {conversion?.status === "finalized"
                    ? money(
                        conversion.converted_amount,
                        conversion.target_currency,
                      )
                    : "Pending conversion"}
                </td>
              </tr>
            );
          })}
        </ListResult>
      </Panel>
    </section>
  );
}
