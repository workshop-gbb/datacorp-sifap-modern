import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Filters, Status, Empty } from "./data-ui";
import { PrintButton } from "./print-button";

describe("accessible viewer controls", () => {
  it("offers labelled filters without mutation controls", async () => {
    // REQ-104 REQ-106 REQ-110
    render(<Filters locale="en" section="payments" search={{ state: "SP" }} />);
    expect(screen.getByRole("combobox", { name: "State" })).toHaveValue("SP");
    await userEvent.type(
      screen.getByRole("textbox", { name: "Search records" }),
      "BEN-0001",
    );
    expect(screen.getByRole("textbox", { name: "Search records" })).toHaveValue(
      "BEN-0001",
    );
    expect(
      screen.queryByRole("button", { name: /delete|create|execute/i }),
    ).not.toBeInTheDocument();
  });
  it("explains status and empty results with text", () => {
    // REQ-102 REQ-110 REQ-111
    render(
      <>
        <Status locale="pt-BR" status="PAID" />
        <Empty locale="pt-BR" />
      </>,
    );
    expect(screen.getByText("Pago")).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "Nenhum registro corresponde a estes filtros.",
      }),
    ).toBeVisible();
  });
  it("invokes the browser print flow", async () => {
    // REQ-108
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    render(<PrintButton label="Print report" />);
    await userEvent.click(screen.getByRole("button", { name: "Print report" }));
    expect(print).toHaveBeenCalledOnce();
    print.mockRestore();
  });
});
