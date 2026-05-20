import { useEffect } from "react";
import { useT } from "@/lib/i18n";

export function HtmlLang() {
  const { lang } = useT();
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return null;
}
