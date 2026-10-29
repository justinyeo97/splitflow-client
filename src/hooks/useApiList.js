import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../api/client.js";

export function useApiList(path, token, limit = 50) {
  const [offset, setOffset] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ limit, offset: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return undefined;
    }
    let current = true;
    setLoading(true);
    setError(null);
    apiRequest(
      `${path}${path.includes("?") ? "&" : "?"}limit=${limit}&offset=${offset}`,
      { token },
    )
      .then((result) => {
        if (!current) return;
        setData(result?.data || []);
        setPagination(result?.pagination || { limit, offset, total: 0 });
      })
      .catch((err) => {
        if (current) setError(err);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [path, token, limit, offset, reloadKey]);

  const refresh = useCallback(() => setReloadKey((value) => value + 1), []);
  return { data, pagination, loading, error, refresh, offset, setOffset };
}
