import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/providers/trpc";

export function useAuth() {
  const [role, setRole] = useState<"admin" | "visitor" | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkSession = trpc.password.checkSession.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!checkSession.isLoading) {
      if (checkSession.data?.valid && checkSession.data.role) {
        setRole(checkSession.data.role as "admin" | "visitor");
      } else {
        setRole(null);
      }
      setIsLoading(false);
    }
  }, [checkSession.isLoading, checkSession.data]);

  const login = useCallback((token: string, userRole: "admin" | "visitor") => {
    localStorage.setItem("eventhub_token", token);
    setRole(userRole);
    window.location.reload();
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("eventhub_token");
    setRole(null);
    window.location.reload();
  }, []);

  const isAdmin = role === "admin";
  const isAuthed = role !== null;

  return { role, isAdmin, isAuthed, isLoading, login, logout };
}
