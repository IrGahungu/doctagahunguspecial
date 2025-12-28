// lib/useSupabaseClient.ts
import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { SupabaseClient } from "@supabase/supabase-js";

export function useSupabaseClient(): SupabaseClient | null {
  // This hook simply returns the singleton instance of the Supabase client.
  // The client in `lib/supabase.ts` is already configured to manage
  // auth state and sessions using AsyncStorage.
  return supabase;
}
