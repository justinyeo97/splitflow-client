import { useAuth } from "../auth/AuthProvider.jsx";
import { useApiList } from "../../hooks/useApiList.js";
import { Heading, Panel, ListResult } from "./operationsUi.jsx";

export default function AuditLogPage() {
  const { session } = useAuth();
  const entries = useApiList("audit-log", session?.access_token, 25);
  return (
    <section className="page-content">
      <Heading eyebrow="ACCOUNTABILITY" title="Audit log" />
      <p className="page-lede">
        Changes recorded since audit logging was enabled. Deleted records remain
        in this history.
      </p>
      <Panel
        title="Company activity"
        action={
          <button
            className="secondary-action"
            disabled={entries.loading}
            onClick={entries.refresh}
          >
            Refresh
          </button>
        }
      >
        <ListResult
          list={entries}
          title="Could not load audit log"
          columns={["Time", "Changed by", "Action", "Record", "Changes"]}
        >
          {entries.data.map((entry) => (
            <tr key={entry.id}>
              <td>{new Date(entry.occurred_at).toLocaleString()}</td>
              <td>
                {entry.actor_email ||
                  (entry.actor_kind === "system"
                    ? "System / scheduled job"
                    : entry.actor_id)}
              </td>
              <td>{entry.operation}</td>
              <td>
                {entry.table_name}
                <br />
                {entry.record_id}
              </td>
              <td>
                <details>
                  <summary>View before / after</summary>
                  <pre
                    style={{
                      maxWidth: 480,
                      maxHeight: 280,
                      overflow: "auto",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {JSON.stringify(
                      { before: entry.before_data, after: entry.after_data },
                      null,
                      2,
                    )}
                  </pre>
                </details>
              </td>
            </tr>
          ))}
        </ListResult>
      </Panel>
    </section>
  );
}
