"use client";
import { useActionState } from "react";
import { ArrowUpRight } from "lucide-react";
import { enterViewer, type LoginState } from "@/app/[locale]/login/actions";
import { dictionary, type Locale } from "@/lib/i18n";
import { Button } from "./ui/button";

export function ViewerButton({
  locale,
  label,
  compact = false,
}: {
  locale: Locale;
  label?: string;
  compact?: boolean;
}) {
  const d = dictionary(locale);
  const [state, action, pending] = useActionState(
    enterViewer,
    {} as LoginState,
  );
  return (
    <form
      action={action}
      className={`viewer-entry ${compact ? "viewer-entry-compact" : ""}`}
      aria-busy={pending}
    >
      <input type="hidden" name="locale" value={locale} />
      <Button
        type="submit"
        className={compact ? "header-signin" : undefined}
        disabled={pending}
      >
        {pending ? d.loginPending : (label ?? d.signIn)}
        <ArrowUpRight size={16} />
      </Button>
      {state.error && (
        <p role="alert" className="form-error">
          {d[state.error]}
        </p>
      )}
    </form>
  );
}
