import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import RoiAnalysis, { RoiAnalysisResult } from "./RoiAnalysis.jsx";

const fact = { id: "selected", label: "Selected report", complete: false,
  revenue: "250.00", costs: "100.00", profit: null, roi_percent: null, placements: 2 };
const result = { analysis: { summary: "<script>untrusted</script>",
  observations: [{ text: "Missing data limits interpretation.", evidence_ids: ["selected"] }],
  investigations: [], limitations: ["Review incomplete data."] },
  facts: [fact], currency: "USD", coverage: { report_rows: 1, periods: 1, entities: 1 },
  generated_at: "2026-11-05T00:00:00Z", cached: false };

describe("ROI analysis presentation", () => {
  it("escapes model content and renders exact server facts with incomplete ratios hidden", () => {
    const html = renderToStaticMarkup(<RoiAnalysisResult result={result} />);
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain("USD 250.00");
    expect(html).toContain("Undefined or incomplete");
    expect(html).toContain("Incomplete data");
    expect(html).toContain("Supporting figures");
  });
  it("makes missing configuration visible and disables generation", () => {
    const html = renderToStaticMarkup(<RoiAnalysis report={{ data: [fact], analysis_available: false }} token="test" />);
    expect(html).toContain("not configured yet");
    expect(html).toContain("connect Groq");
    expect(html).not.toContain("OpenAI");
    expect(html).toContain("disabled");
    expect(html).not.toContain("test");
  });
  it("offers generation without running a request while the report is rendered", () => {
    const html = renderToStaticMarkup(<RoiAnalysis report={{ data: [fact], analysis_available: true }} token="test" />);
    expect(html).toContain("Analyze ROI");
    expect(html).not.toContain("disabled");
    expect(html).toContain("Runs only when requested");
    expect(html).toContain("to Groq");
    expect(html).toContain("Free usage limits apply");
  });
});
