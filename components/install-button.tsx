"use client";

import { btnSecondarySm } from "@/components/eventjini/classes";
import { useEffect, useState, useSyncExternalStore } from "react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function InstallButton({ label = "Install EventJini" }: { label?: string }) {
  const [promptEvent, setPromptEvent] = useState<InstallEvent | null>(null);
  const standalone = useSyncExternalStore(
    () => () => {},
    () => window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true,
    () => true
  );
  const ios = useSyncExternalStore(
    () => () => {},
    () => /iphone|ipad|ipod/i.test(navigator.userAgent),
    () => false
  );

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as InstallEvent);
    };
    const onInstalled = () => setPromptEvent(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (standalone) return null;
  if (promptEvent) {
    return (
      <button
        type="button"
        onClick={async () => {
          await promptEvent.prompt();
          setPromptEvent(null);
        }}
        className={btnSecondarySm}
      >
        {label}
      </button>
    );
  }
  if (ios) {
    return <p className="text-xs text-muted-foreground">To install: tap Share, then &ldquo;Add to Home Screen&rdquo;.</p>;
  }
  return null;
}
