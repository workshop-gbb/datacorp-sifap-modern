import type { ComponentProps } from "react";

// A consulta usa navegacao de documento para revalidar a sessao sem cache RSC.
export function AppLink(props: ComponentProps<"a">) {
  return <a {...props} />;
}
