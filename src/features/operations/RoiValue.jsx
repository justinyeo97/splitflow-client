import "./roi-value.css";

export default function RoiValue({ value, children }) {
  const text = value == null ? "" : String(value);
  const nonzero = /^-?\d+(?:\.\d+)?$/.test(text) && /[1-9]/.test(text);
  const tone = nonzero ? (text.startsWith("-") ? "negative" : "positive") : "neutral";

  return <span className={`roi-value roi-value--${tone}`}>{children}</span>;
}
