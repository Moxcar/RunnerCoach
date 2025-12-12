import { createContext, useContext, useEffect, useRef } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuthStore, initializeAuth, UserProfile } from "@/stores/authStore";
import { useUserProfile, useRefreshProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: "admin" | "coach" | "client" | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    name: string,
    role: "admin" | "coach" | "user"
  ) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// QueryClient para TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutos
    },
  },
});

function AuthProviderInner({ children }: { children: React.ReactNode }) {
  const { user, profile, setUser, setProfile, initialized, setInitialized } =
    useAuthStore();
  const {
    data: profileData,
    isLoading: profileLoading,
    refetch,
  } = useUserProfile(user?.id || null);
  const refreshProfile = useRefreshProfile();
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<any>(null);

  // Sincronizar perfil del query con el store
  useEffect(() => {
    if (profileData) {
      setProfile(profileData);
    }
  }, [profileData, setProfile]);

  // Inicializar autenticación al montar
  useEffect(() => {
    if (!initialized) {
      initializeAuth();
    }
  }, [initialized]);

  // Suscribirse a cambios de autenticación
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        // Refrescar perfil cuando cambia la autenticación
        if (event === "SIGNED_IN" || event === "SIGNED_UP") {
          // Esperar un poco para que el trigger cree el perfil
          setTimeout(() => {
            refetch();
          }, 1000);
        } else {
          refetch();
        }
      } else {
        setUser(null);
        setProfile(null);
        // Limpiar caché de queries cuando se cierra sesión
        queryClient.clear();
      }
    });

    subscriptionRef.current = subscription;

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [setUser, setProfile, refetch, queryClient]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (
    email: string,
    password: string,
    name: string,
    role: "admin" | "coach" | "user"
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role,
        },
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setProfile(null);
    queryClient.clear();
    // Limpiar el store también
    useAuthStore.getState().clearAuth();
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
    });
    if (error) throw error;
  };

  const handleRefreshProfile = async () => {
    await refreshProfile();
  };

  const loading = !initialized || (!!user && profileLoading);
  const currentProfile = profile || profileData || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile: currentProfile,
        role: currentProfile?.role ?? null,
        loading,
        signIn,
        signUp,
        signOut,
        signInWithGoogle,
        refreshProfile: handleRefreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProviderInner>{children}</AuthProviderInner>
    </QueryClientProvider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
