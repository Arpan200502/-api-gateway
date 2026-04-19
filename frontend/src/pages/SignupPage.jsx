import { useState } from "react";
import { Link } from "react-router-dom";
import AuthShell from "../components/layout/AuthShell";
import Button from "../components/ui/Button";
import InputField from "../components/ui/InputField";
import { signup } from "../services/auth";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      await signup(email.trim(), password);
      setMessage("Signup complete. You can login now.");
      setEmail("");
      setPassword("");
    } catch (nextError) {
      setError(nextError.message || "Unable to signup");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create Account"
      subtitle="Set up your Obsidian Gateway workspace"
      switchText="Already registered?"
      switchLink="/login"
      switchCta="Login"
    >
      <form onSubmit={onSubmit} className="stack-gap">
        <InputField
          id="signup-email"
          label="Email"
          value={email}
          onChange={setEmail}
          type="email"
          placeholder="you@company.com"
          required
        />
        <InputField
          id="signup-password"
          label="Password"
          value={password}
          onChange={setPassword}
          type="password"
          placeholder="Minimum 8 characters"
          required
        />
        {error ? <p className="error-text">{error}</p> : null}
        {message ? <p className="success-text">{message}</p> : null}
        <Button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Account"}
        </Button>
      </form>
      <p className="muted small-top">
        Return to <Link to="/">landing page</Link>
      </p>
    </AuthShell>
  );
}
