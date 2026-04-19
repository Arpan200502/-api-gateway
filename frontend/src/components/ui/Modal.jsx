export default function Modal({ title, children, onClose, className = "" }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className={`modal ${className}`.trim()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" type="button" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
