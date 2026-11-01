import { describe, expect, it } from "vitest";
import { csvCell, reportCsv } from "./csv.js";

describe("finance CSV", () => {
  it("escapes commas, quotes and newlines and retains Unicode", () => {
    expect(
      reportCsv(
        [{ name: 'Yeo, "J"\n新', amount: "12.50" }],
        [
          ["Name", "name"],
          ["Amount", "amount"],
        ],
      ),
    ).toBe('\uFEFF"Name","Amount"\r\n"Yeo, ""J""\n新","12.50"');
  });
  it("blocks formulas while preserving negative financial values and zero", () => {
    for (const input of ["=1+1", "+SUM(A1)", "@SUM(A1)", "-cmd", "\t=1+1"])
      expect(csvCell(input)).toContain("'");
    expect(csvCell("-125.50")).toBe('"-125.50"');
    expect(csvCell(0)).toBe('"0"');
    expect(csvCell(null)).toBe('""');
  });
  it("exports all supplied rows and supports computed columns", () => {
    const csv = reportCsv(
      Array.from({ length: 30 }, (_, id) => ({ id })),
      [["ID", (row) => row.id]],
    );
    expect(csv.split("\r\n")).toHaveLength(31);
  });
});
