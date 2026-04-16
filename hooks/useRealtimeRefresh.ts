import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useRealtimeRefresh(
  table: string,
  callback: (payload: any) => void,
  filter?: string
) {
  useEffect(() => {
    console.log(`Subscribing to realtime for table: ${table}`);

    const channel = supabase
      .channel(`${table}-realtime-${Math.random().toString(36).substring(7)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) },
        (payload) => {
          console.log(`Realtime event received for ${table}:`);
          console.log(payload);

          callback(payload);
        }
      )
      .subscribe((status) => {
        console.log(`Realtime status for ${table}:`, status);
      });

    return () => {
      console.log(`Unsubscribing from ${table}`);
      supabase.removeChannel(channel);
    };
  }, [table, filter]);
}