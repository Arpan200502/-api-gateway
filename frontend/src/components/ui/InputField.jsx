export default function InputField({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  disabled
}) {
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        disabled={disabled}
      />
    </label>
  );
}
