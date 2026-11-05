import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../../api/client.js";
import "./roi-analysis.css";

function groupedNumber(value) {
  const [whole, fraction] = String(value).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}

function Evidence({ fact, currency }) {
  return (
    <div className="roi-analysis-evidence">
      <strong>{fact.label}</strong>
      {!fact.complete && <span className="roi-analysis-partial">Incomplete data; totals may be partial</span>}
      <dl>
        <div><dt>Revenue</dt><dd>{currency} {groupedNumber(fact.revenue)}</dd></div>
        <div><dt>Total costs</dt><dd>{currency} {groupedNumber(fact.costs)}</dd></div>
        <div><dt>Profit</dt><dd>{fact.profit == null ? "Unavailable" : `${currency} ${groupedNumber(fact.profit)}`}</dd></div>
        <div><dt>ROI</dt><dd>{fact.roi_percent == null ? "Undefined or incomplete" : `${groupedNumber(fact.roi_percent)}%`}</dd></div>
        <div><dt>Placements</dt><dd>{groupedNumber(fact.placements)}</dd></div>
      </dl>
    </div>
  );
}

export function RoiAnalysisResult({ result }) {
  const facts = new Map(result.facts.map((fact) => [fact.id, fact]));
  return (
    <div className="roi-analysis-result">
      <p>{result.analysis.summary}</p>
      <div className="roi-analysis-columns">
        {[["Observations", result.analysis.observations], ["Suggested investigations", result.analysis.investigations]].map(([title, items]) => (
          <div key={title}>
            <h4>{title}</h4>
            {items.length === 0 ? <p>No supported findings for this section.</p> : (
              <ul>{items.map((item, index) => (
                <li key={index}>
                  <p>{item.text}</p>
                  <details>
                    <summary>Supporting figures</summary>
                    {[...new Set(item.evidence_ids)].map((id) => facts.has(id) && (
                      <Evidence key={id} fact={facts.get(id)} currency={result.currency} />
                    ))}
                  </details>
                </li>
              ))}</ul>
            )}
          </div>
        ))}
      </div>
      {result.analysis.limitations.length > 0 && (
        <div>
          <h4>Limitations</h4>
          <ul>{result.analysis.limitations.map((text, index) => <li key={index}>{text}</li>)}</ul>
        </div>
      )}
      <p className="roi-analysis-footnote">
        Based on {result.coverage.report_rows} report rows across {result.coverage.periods} period(s)
        and {result.coverage.entities} group(s). Detailed evidence covers up to the latest twelve
        periods and twelve groups by revenue. Consultant labels are anonymous.
      </p>
      <p className="roi-analysis-footnote">
        {result.cached ? "Saved analysis from " : "Generated "}
        <time dateTime={result.generated_at}>{new Date(result.generated_at).toLocaleString()}</time>.
        {" "}AI interpretation may be inaccurate; review the supporting figures before acting.
      </p>
    </div>
  );
}

export default function RoiAnalysis({ report, token, onRefresh }) {
  const [state, setState] = useState({ loading: false, result: null, error: null });
  const request = useRef(null);
  useEffect(() => () => request.current?.abort(), []);

  async function analyze() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setState({ loading: true, result: null, error: null });
    try {
      const result = await apiRequest("reports/roi/analysis", {
        method: "POST", token, signal: controller.signal,
        body: { filters: report.filters, snapshot: report.snapshot },
      });
      if (!controller.signal.aborted)
        setState({ loading: false, result: result.data, error: null });
    } catch (error) {
      if (!controller.signal.aborted)
        setState({ loading: false, result: null, error });
    }
  }

  return (
    <section className="roi-analysis" aria-label="AI ROI analysis" aria-busy={state.loading}>
      <div className="roi-analysis-heading">
        <div>
          <h3>AI ROI analysis</h3>
          <p>Explain these results and identify areas to investigate.</p>
        </div>
        <button type="button" className="secondary-action" onClick={analyze}
          disabled={state.loading || !report.analysis_available || !report.data.length}>
          {state.loading ? "Analyzing ROI…" : state.result ? "Analyze again" : "Analyze ROI"}
        </button>
      </div>
      {!report.analysis_available && (
        <p>AI analysis is not configured yet. Ask your administrator to connect Groq.</p>
      )}
      {report.analysis_available && !state.result && !state.loading && !state.error && (
        <p className="roi-analysis-footnote">
          Runs only when requested. Sends report aggregates to Groq with consultant names removed.
          Your ROI calculations remain the source of truth.
          {" "}Free usage limits apply; try later if the limit is reached.
        </p>
      )}
      <div role="status" aria-live="polite">
        {state.loading && <p>Analyzing the selected report. You can continue reviewing the table.</p>}
      </div>
      {state.error && (
        <div className="inline-error" role="alert">
          <p>{state.error.message}</p>
          {state.error.status === 409 && (
            <button type="button" className="secondary-action" onClick={onRefresh}>Refresh ROI</button>
          )}
        </div>
      )}
      {state.result && <RoiAnalysisResult result={state.result} />}
    </section>
  );
}
