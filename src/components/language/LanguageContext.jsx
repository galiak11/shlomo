import React, { createContext, useContext } from 'react';

// MVP: Hebrew only. i18n infrastructure ready for English/Russian later.
const LanguageContext = createContext({
  currentLanguage: 'he',
  direction: 'rtl',
});

export const LanguageProvider = ({ children }) => {
  return (
    <LanguageContext.Provider value={{
      currentLanguage: 'he',
      direction: 'rtl',
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
