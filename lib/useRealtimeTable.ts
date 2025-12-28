import { useEffect, useState } from 'react';
import { supabase } from './supabase';

type OrderBy = { column: string; ascending: boolean };

export function useRealtimeTable<T>(
  table: string,
  orderBy?: OrderBy
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);

    let query = supabase.from(table).select<string, T>('*');
    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending });
    }

    const { data: result, error } = await query;

    if (error) {
      console.error(`Error fetching ${table}:`, error.message);
    } else {
      setData(result || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    // Initial fetch
    fetchData();

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`${table}-updates`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        console.log(`Realtime change in ${table}:`, payload);
        fetchData(); // re-fetch latest data
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table]);

  return { data, loading, refetch: fetchData };
}

export default useRealtimeTable;
