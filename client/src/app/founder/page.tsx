import { redirect } from "next/navigation";

/**
 * Founder mode merged into dashboard.
 * Redirect /founder → / for backward compatibility.
 */
export default function FounderRedirect() {
  redirect("/");
}
