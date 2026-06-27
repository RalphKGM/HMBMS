import { useMemo, useState } from "react";
import { AuthContext } from "./authContext";
import { authenticate } from "../service/authService";

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
