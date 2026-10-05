import Link from "next/link";
import { cn } from "@/lib/utils";

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("rounded-md font-heading text-xl font-bold tracking-tight", className)}>
      Event<span className="text-primary">Jini</span>
    </Link>
  );
}
