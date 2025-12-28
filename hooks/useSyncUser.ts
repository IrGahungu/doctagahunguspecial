import { useEffect } from "react";
import { useUser } from "@clerk/clerk-expo";
import { supabase } from "@/lib/supabase";

export function useSyncUser() {
  const { user } = useUser();

  useEffect(() => {
    if (!user) return;

    const syncUser = async () => {
      try {
        // Insert or update user in Supabase
        await supabase.from("users").upsert({
          id: user.id, // Clerk user_id (UUID)
          email: user.primaryEmailAddress?.emailAddress,
          full_name: user.fullName,
        });
      } catch (err) {
        console.error("Error syncing user with Supabase:", err);
      }
    };

    syncUser();
  }, [user]);
}
