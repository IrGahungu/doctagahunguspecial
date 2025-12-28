import { useEffect, useState } from 'react';

export function useFrameworkReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Simulate async framework init (replace with real logic later)
    const init = async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      setReady(true);
    };
    init();
  }, []);

  return ready; // always boolean
}
