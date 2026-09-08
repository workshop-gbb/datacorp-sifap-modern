import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ViewerButton } from "./viewer-button";
vi.mock("@/app/[locale]/login/actions", () => ({
  enterViewer: vi.fn(async () => ({})),
}));

it("REQ-117: offers a direct viewer action without exposing credentials", () => {
  render(<ViewerButton locale="pt-BR" label="Entrar como viewer" />);
  expect(
    screen.getByRole("button", { name: "Entrar como viewer" }),
  ).toBeVisible();
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  expect(document.querySelector("input[name=locale]")).toHaveValue("pt-BR");
  expect(document.querySelector("input[type=password]")).toBeNull();
});
