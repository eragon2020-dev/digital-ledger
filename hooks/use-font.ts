import { useEffect, useState } from 'react';

// Default system font
export function useFarumaFont() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(true);
  }, []);

  return loaded;
}
