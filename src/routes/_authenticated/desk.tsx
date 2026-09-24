import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

/** Legacy route — validation workspace lives on /dashboard for AT. */
export const Route = createFileRoute("/_authenticated/desk")({ component: DeskRedirect });

function DeskRedirect() {
  const nav = useNavigate();
  useEffect(() => {
    nav({ to: "/dashboard", replace: true });
  }, [nav]);
  return null;
}
