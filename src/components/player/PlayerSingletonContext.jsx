/**
 * PlayerSingleton context — ensures only one video plays at a time.
 *
 * Each VideoPlayer registers a pause callback.
 * When any player starts playing, all other registered players are paused.
 */

import { createContext, useContext, useRef, useCallback } from 'react';

const PlayerSingletonContext = createContext(null);

export function PlayerSingletonProvider({ children }) {
  const pauseFnsRef = useRef(new Set());

  const register = useCallback((pauseFn) => {
    pauseFnsRef.current.add(pauseFn);
    return () => pauseFnsRef.current.delete(pauseFn);
  }, []);

  const notifyPlay = useCallback((callerPauseFn) => {
    pauseFnsRef.current.forEach((fn) => {
      if (fn !== callerPauseFn) fn();
    });
  }, []);

  return (
    <PlayerSingletonContext.Provider value={{ register, notifyPlay }}>
      {children}
    </PlayerSingletonContext.Provider>
  );
}

export function usePlayerSingleton() {
  return useContext(PlayerSingletonContext);
}
