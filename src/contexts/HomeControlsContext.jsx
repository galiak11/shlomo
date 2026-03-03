import { createContext, useContext, useState } from 'react';

const HomeControlsContext = createContext({ controls: null, setControls: () => {} });

export function HomeControlsProvider({ children }) {
  const [controls, setControls] = useState(null);
  return (
    <HomeControlsContext.Provider value={{ controls, setControls }}>
      {children}
    </HomeControlsContext.Provider>
  );
}

export function useHomeControls() {
  return useContext(HomeControlsContext);
}
