import { useEffect, useState, useCallback } from "react";
import { hasPinSet, isLockedOut, updateLastActive } from "@/lib/pinLock";

export function useAppLock() {
  const [locked, setLocked] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);

  useEffect(() => {
    const enabled = hasPinSet();
    setPinEnabled(enabled);
    if (enabled && isLockedOut()) {
      setLocked(true);
    } else {
      updateLastActive();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (hasPinSet() && isLockedOut()) {
          setLocked(true);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (locked) return;
    const updateActivity = () => updateLastActive();
    window.addEventListener("click", updateActivity);
    window.addEventListener("keydown", updateActivity);
    return () => {
      window.removeEventListener("click", updateActivity);
      window.removeEventListener("keydown", updateActivity);
    };
  }, [locked]);

  const unlock = useCallback(() => {
    updateLastActive();
    setLocked(false);
  }, []);

  return { locked, pinEnabled, unlock, refreshPinStatus: () => setPinEnabled(hasPinSet()) };
}