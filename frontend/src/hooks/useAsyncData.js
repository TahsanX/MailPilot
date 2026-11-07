import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Runs an async loader whenever `deps` change and tracks loading, error and data.
 * Data from a previous set of inputs is never returned, so a changed filter cannot show old figures.
 * Stale responses are ignored when inputs change quickly. Reloading keeps the current data visible.
 */
export function useAsyncData(loader, deps, { enabled = true } = {}) {
  const baseKey = JSON.stringify(deps);
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState({ baseKey: null, runKey: null, data: null, error: null });
  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  });

  const runKey = `${baseKey}:${nonce}`;

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    loaderRef.current().then(
      (data) => !cancelled && setResult({ baseKey, runKey, data, error: null }),
      (err) => !cancelled && setResult((r) => ({ baseKey, runKey, data: r.baseKey === baseKey ? r.data : null, error: err.message || "Something went wrong." })),
    );
    return () => {
      cancelled = true;
    };
  }, [enabled, baseKey, runKey]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const data = result.baseKey === baseKey ? result.data : null;

  let status = "loading";
  if (!enabled) status = "idle";
  else if (result.runKey === runKey) status = result.error ? "error" : "ready";

  return { status, data, error: result.runKey === runKey ? result.error : null, reload };
}
