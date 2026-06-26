import { createContext, useContext, useMemo, useState } from "react";
import { authenticate } from "../service/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);

  const login = async (username, password) => {
    const user = await authenticate(username, password);
    setCurrentUser(user);
    return user;
  };

  const logout = () => {
    setCurrentUser(null);
  };


  const value = useMemo(
    () => ({
      currentUser,
      login,
      logout,
      setCurrentUser,
      isAdmin: currentUser?.role === "Admin",
    }),
    [currentUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}