import { createContext, useContext, useMemo, useState } from "react";
import {
  clearAuthUser,
  clearToken,
  getAuthUser,
  getToken,
  getUserFromToken,
  setAuthUser,
  setToken
} from "../services/storage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(getToken());
  const [user, setUser] = useState(() => {
    const tokenUser = getUserFromToken();
    const authUser = getAuthUser();
    if (!tokenUser) {
      return null;
    }
    return {
      ...tokenUser,
      role: authUser?.role || tokenUser.role || "dev",
      email: authUser?.email || tokenUser.email || null
    };
  });

  const login = (nextToken, authPayload = {}) => {
    setToken(nextToken);
    setAuthUser({
      role: authPayload?.role || "dev",
      email: authPayload?.email || null,
      userId: authPayload?.userId || null
    });
    setTokenState(nextToken);
    const tokenUser = getUserFromToken();
    setUser({
      ...tokenUser,
      role: authPayload?.role || tokenUser?.role || "dev",
      email: authPayload?.email || tokenUser?.email || null
    });
  };

  const logout = () => {
    clearToken();
    clearAuthUser();
    setTokenState(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({ token, user, login, logout }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
