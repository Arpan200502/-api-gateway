export default function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      className={`toggle ${checked ? "toggle-on" : "toggle-off"}`}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
    >
      <span>{label}</span>
      <span className="toggle-pill">
        <span className="toggle-knob" />
      </span>
    </button>
  );
}
