export default function Button({
  children,
  type = "button",
  variant = "primary",
  onClick,
  disabled,
  className = ""
}) {
  return (
    <button
      type={type}
      className={`btn btn-${variant} ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
