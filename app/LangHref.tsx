"use client";

import type { ReactNode } from "react";
import { hrefWithLang } from "./site";
import { useSiteLang } from "./SiteChrome";

export function LangHref({
  href,
  className,
  testId,
  children,
}: {
  href: string;
  className?: string;
  testId?: string;
  children: ReactNode;
}) {
  const { lang } = useSiteLang();
  return (
    <a className={className} data-testid={testId} href={hrefWithLang(href, lang)}>
      {children}
    </a>
  );
}
