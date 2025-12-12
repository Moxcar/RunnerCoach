import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type UserRole = "admin" | "coach" | "client" | null;

export interface UserProfile {
  id: string;
  full_name: string;
  role: UserRole;
  is_approved?: boolean;
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  session: any | null;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setSession: (session: any | null) => void;
  setInitialized: (initialized: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      profile: null,
      session: null,
      initialized: false,
      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      setSession: (session) => set({ session }),
      setInitialized: (initialized) => set({ initialized }),
      clearAuth: () =>
        set({
          user: null,
          profile: null,
          session: null,
        }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Solo persistir el user básico, no el session completo
        user: state.user,
      }),
    }
  )
);

// Inicializar autenticación desde Supabase
export const initializeAuth = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      useAuthStore.getState().setUser(session.user);
      useAuthStore.getState().setSession(session);
    } else {
      useAuthStore.getState().clearAuth();
    }
    
    useAuthStore.getState().setInitialized(true);
  } catch (error) {
    console.error("Error initializing auth:", error);
    useAuthStore.getState().setInitialized(true);
  }
};

