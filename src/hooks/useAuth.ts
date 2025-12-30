import { createContext, useContext } from "react";

type AuthStatus = "loading" | "signedOut" | "signedIn";

export interface AuthContextValue {
  status: AuthStatus;
  userEmail?: string;
  username?: string;
  sub?: string;
  groups?: string[];
  attributes?: Record<string, string>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthGate");
  }
  console.log('[useAuth] 🔐 Current auth context:', {
    status: context.status,
    username: context.username,
    userEmail: context.userEmail,
    attributes: context.attributes
  });
  return context;
};
