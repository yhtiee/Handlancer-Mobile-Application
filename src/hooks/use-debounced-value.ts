import { useEffect, useState } from 'react';

/**
 * Trails `value` by `delay`, restarting the timer on every change.
 *
 * Search fields feed their raw text straight into a query key, so without this
 * typing "plumber" issues seven requests and races their responses. Debouncing
 * the value (not the request) keeps the input responsive while the query only
 * sees what the user settled on.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
