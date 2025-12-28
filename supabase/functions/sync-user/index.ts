import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const { user } = await req.json();
    if (!user) return new Response("Missing user", { status: 400 });

    const supabase = createClient(
       Deno.env.get("PROJECT_URL") ?? "",
       Deno.env.get("SERVICE_ROLE_KEY") ?? ""
);


    // Sync Clerk user into Supabase
    const { error } = await supabase.from("users").upsert({
      clerk_id: user.id,
      email: user.email,
      name: user.name,
    });

    if (error) throw error;

    return new Response("User synced in Supabase", { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response("Error syncing user", { status: 500 });
  }
});
