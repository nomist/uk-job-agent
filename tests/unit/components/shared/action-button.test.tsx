// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ActionButton } from "@/components/shared/action-button";

describe("ActionButton", () => {
  it("renders the idle label and calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn().mockResolvedValue(undefined);
    render(
      <ActionButton
        onClick={onClick}
        idleLabel="Save"
        pendingLabel="Saving…"
        doneLabel="Saved ✓"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onClick).toHaveBeenCalled();
  });

  it("shows the done label and stops being interactive once onClick succeeds", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn().mockResolvedValue(undefined);
    render(
      <ActionButton
        onClick={onClick}
        idleLabel="Save"
        pendingLabel="Saving…"
        doneLabel="Saved ✓"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.getByText("Saved ✓")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });

  it("shows an error and a Retry button on failure, retrying calls onClick again", async () => {
    const user = userEvent.setup();
    const onClick = vi
      .fn()
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(undefined);
    render(
      <ActionButton
        onClick={onClick}
        idleLabel="Save"
        pendingLabel="Saving…"
        doneLabel="Saved ✓"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.getByText("Network error")).toBeInTheDocument());
    const retryButton = screen.getByRole("button", { name: "Retry" });

    await user.click(retryButton);

    await waitFor(() => expect(screen.getByText("Saved ✓")).toBeInTheDocument());
    expect(onClick).toHaveBeenCalledTimes(2);
  });
});
