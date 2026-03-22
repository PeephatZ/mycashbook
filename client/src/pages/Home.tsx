import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Home page - redirects to dashboard directly (no authentication required)
 */
export default function Home() {
  const [, navigate] = useLocation();

  useEffect(() => {
    // Redirect to dashboard immediately
    navigate("/dashboard");
  }, [navigate]);

  return null;
}
