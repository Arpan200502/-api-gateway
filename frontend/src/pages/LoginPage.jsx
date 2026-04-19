import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "../components/layout/AuthShell";
import Button from "../components/ui/Button";
import InputField from "../components/ui/InputField";
import { useAuth } from "../context/AuthContext";
import { extractToken, signin } from "../services/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = await signin(email.trim(), password);
      const token = extractToken(payload);
      if (!token) {
        throw new Error("Token not found in login response");
      }
      login(token, {
        role: payload?.role || "dev",
        email: payload?.email || email.trim(),
        userId: payload?.userId || null
      });
      navigate("/dashboard");
    } catch (nextError) {
      setError(nextError.message || "Unable to login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome Back"
      subtitle="Sign in to manage your API gateways"
      switchText="No account yet?"
      switchLink="/signup"
      switchCta="Create account"
    >
      <form onSubmit={onSubmit} className="stack-gap">
        <InputField
          id="email"
          label="Email"
          value={email}
          onChange={setEmail}
          type="email"
          placeholder="you@company.com"
          required
        />
        <InputField
          id="password"
          label="Password"
          value={password}
          onChange={setPassword}
          type="password"
          placeholder="••••••••"
          required
        />
        {error ? <p className="error-text">{error}</p> : null}
        <Button type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </Button>
      </form>
      <p className="muted small-top">
        Return to <Link to="/">landing page</Link>
      </p>
    </AuthShell>
  );
}
