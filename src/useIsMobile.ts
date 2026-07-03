import { useEffect, useState } from "react";

const QUERY = "(max-width: 640px)";

/** Reagiert auf Bildschirmbreite: true = Handy-Layout (Bottom-Sheets, kompakte Leisten) */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() => window.matchMedia(QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = () => setMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return mobile;
}
