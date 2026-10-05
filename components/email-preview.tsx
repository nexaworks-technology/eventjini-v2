"use client";

import { useMemo } from "react";
import { renderEmailHtml, type EmailBrand } from "@/lib/email/layout";
import { renderTemplate } from "@/lib/email/template";

/** Renders the exact HTML recipients get, with sample data, in a sandboxed frame. */
export function EmailPreview({ body, brand }: { body: string; brand: EmailBrand }) {
  const html = useMemo(() => {
    const vars = {
      first_name: "Alex",
      event_title: brand.eventTitle,
      event_date: brand.when ?? "",
      event_location: brand.where ?? "",
    };
    return renderEmailHtml(renderTemplate(body || "Your message appears here.", vars), brand);
  }, [body, brand]);
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-foreground">Preview</p>
      <iframe title="Email preview" sandbox="" srcDoc={html} className="h-[28rem] w-full rounded-md border border-border bg-white" />
    </div>
  );
}
