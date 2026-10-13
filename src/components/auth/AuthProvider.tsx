"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import AuthModal from "./AuthModal";

type AuthMode = "login" | "register";

type AuthModalContextType = {
  openAuth: (mode?: AuthMode) => void;
  closeAuth: () => void;
};

const AuthModalContext = createContext<AuthModalContextType | null>(null);

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (!context) throw new Error("useAuthModal must be used inside AuthProvider");
  return context;
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");

  function openAuth(nextMode: AuthMode = "login") {
    setMode(nextMode);
    setMounted(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  }

  function closeAuth() {
    setVisible(false);
    window.setTimeout(() => setMounted(false), 280);
  }

  useEffect(() => {
    if (!mounted) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") closeAuth();
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [mounted]);

  return (
    <AuthModalContext.Provider value={{ openAuth, closeAuth }}>
      {children}
      {mounted && (
        <AuthModal
          mode={mode}
          setMode={setMode}
          close={closeAuth}
          visible={visible}
        />
      )}
    </AuthModalContext.Provider>
  );
}
