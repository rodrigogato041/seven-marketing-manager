import { useEffect, useState } from "react";

const STORAGE_KEY = "seven-marketing-hide-financial-values";
const CHANGE_EVENT = "seven-marketing-financial-privacy-change";
const HIDDEN_VALUE = "R$ •••••";

function readHiddenPreference() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "true";
}

export function useFinancialPrivacy() {
  const [hideFinancialValues, setHideFinancialValues] = useState(readHiddenPreference);

  useEffect(() => {
    const handleChange = () => setHideFinancialValues(readHiddenPreference());
    window.addEventListener("storage", handleChange);
    window.addEventListener(CHANGE_EVENT, handleChange);
    return () => {
      window.removeEventListener("storage", handleChange);
      window.removeEventListener(CHANGE_EVENT, handleChange);
    };
  }, []);

  const toggleFinancialValues = () => {
    const nextValue = !hideFinancialValues;
    window.localStorage.setItem(STORAGE_KEY, String(nextValue));
    setHideFinancialValues(nextValue);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  const financialValue = (value: string) => hideFinancialValues ? HIDDEN_VALUE : value;

  return { hideFinancialValues, toggleFinancialValues, financialValue };
}
