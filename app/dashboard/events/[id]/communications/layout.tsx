import type { ReactNode } from "react";
import { requireFeature } from "@/lib/features";

export default function FeatureGate({ children }: { children: ReactNode }) {
  requireFeature("communications");
  return children;
}
