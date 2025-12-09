import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore, UserProfile } from "@/stores/authStore";

export const useUserProfile = (userId: string | null) => {
  const { setProfile } = useAuthStore();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["userProfile", userId],
    queryFn: async (): Promise<UserProfile | null> => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // Perfil no encontrado
          console.warn("Profile not found for user:", userId);
          return null;
        }
        throw error;
      }

      if (data) {
        setProfile(data);
        return data;
      }

      return null;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useRefreshProfile = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  return async () => {
    if (user?.id) {
      await queryClient.invalidateQueries({ queryKey: ["userProfile", user.id] });
    }
  };
};

