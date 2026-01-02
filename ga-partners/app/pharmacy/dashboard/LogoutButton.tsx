"use client";

import { logout } from "@/app/actions";
import { useFormStatus } from "react-dom";

interface LogoutButtonProps {
  className?: string;
}

export default function LogoutButton({ className }: LogoutButtonProps) {
  const { pending } = useFormStatus();

  return (
    <form action={logout}>
      <button type="submit" className={className} disabled={pending}>
        {pending ? "Logging out..." : "Logout"}
      </button>
    </form>
  );
}