import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

/** Legacy route — provincial consultation lives on the dashboard. */
export const Route = createFileRoute("/_authenticated/provincial")({ component: ProvincialRedirect });

function ProvincialRedirect() {
  const nav = useNavigate();
  useEffect(() => {
    nav({ to: "/dashboard", replace: true });
  }, [nav]);
  return null;
}
