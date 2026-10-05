"use client";

import { useEffect, useRef } from "react";

const KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

export function PageViewTracker({ eventId }: { eventId: string }) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;

    const params = new URLSearchParams(window.location.search);
    const body: Record<string, string> = { path: window.location.pathname, referrer: document.referrer };
    for (const k of KEYS) {
      const v = params.get(k);
      if (v) body[k] = v;
    }
    fetch(`/api/events/${eventId}/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
  }, [eventId]);

  return null;
}
