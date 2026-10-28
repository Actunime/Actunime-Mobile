import { useEffect, useState } from 'react';

/** Valeur qui ne suit `value` qu'après `delay` ms sans changement (saisie de recherche). */
export function useDebounced<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
