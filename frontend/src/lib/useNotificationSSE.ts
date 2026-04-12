"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { api } from "@/lib/api";

const POLL_INTERVAL = 15_000; // 15 seconds

export function useNotificationSSE() {
  const [unreadCount, setUnreadCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const poll = useCallback(async () => {
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("sgrh_token")
          : null;
      if (!token) return;

      const data = await api.notifications();
      setUnreadCount(data.unread_count);
    } catch {
      // Ignore errors silently - will retry on next tick
    }
  }, []);

  useEffect(() => {
    poll(); // Initial fetch
    timerRef.current = setInterval(poll, POLL_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [poll]);

  const resetCount = useCallback(() => setUnreadCount(0), []);

  return { unreadCount, latestNotifs: [], resetCount };
}
