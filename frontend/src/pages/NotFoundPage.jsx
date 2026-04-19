import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="center-page">
      <h1>Page not found</h1>
      <p className="muted">The route you requested does not exist.</p>
      <Link to="/" className="btn btn-primary">
        Go to landing
      </Link>
    </div>
  );
}
