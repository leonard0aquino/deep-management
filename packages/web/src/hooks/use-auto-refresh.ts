"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function useAutoRefresh(intervalSeconds: number) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(intervalSeconds);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(() => new Date());
  const [paused, setPaused] = useState(false);
  const [isRefreshing, startTransition] = useTransition();
  const remainingRef = useRef(intervalSeconds);

  const refreshNow = useCallback(() => {
    remainingRef.current = intervalSeconds;
    setSecondsLeft(intervalSeconds);
    setLastUpdatedAt(new Date());
    startTransition(() => router.refresh());
  }, [intervalSeconds, router]);

  useEffect(() => {
    function handleVisibility() {
      setPaused(document.visibilityState === "hidden");
    }
    handleVisibility();
    document.addEventListener("visibilitychange", handleVisibility);

    const interval = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      remainingRef.current -= 1;
      if (remainingRef.current <= 0) {
        remainingRef.current = intervalSeconds;
        setLastUpdatedAt(new Date());
        startTransition(() => router.refresh());
      }
      setSecondsLeft(remainingRef.current);
    }, 1000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(interval);
    };
  }, [router, intervalSeconds]);

  return {
    minutes: Math.floor(secondsLeft / 60),
    seconds: secondsLeft % 60,
    lastUpdatedAt,
    paused,
    isRefreshing,
    refreshNow,
  };
}
