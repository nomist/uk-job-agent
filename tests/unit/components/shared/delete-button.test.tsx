// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeleteButton } from "@/components/shared/delete-button";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DeleteButton", () => {
  it("shows a native confirm() with the given message before deleting", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<DeleteButton onDelete={onDelete} confirmMessage="Delete this item?" />);

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(confirmSpy).toHaveBeenCalledWith("Delete this item?");
    expect(onDelete).toHaveBeenCalled();
  });

  it("does not call onDelete when the confirmation is cancelled", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<DeleteButton onDelete={onDelete} confirmMessage="Delete this item?" />);

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(onDelete).not.toHaveBeenCalled();
  });

  it("shows the pending label while onDelete is in flight", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    let resolveDelete: () => void = () => {};
    const onDelete = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveDelete = resolve;
        }),
    );
    render(<DeleteButton onDelete={onDelete} confirmMessage="Delete this item?" />);

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(screen.getByRole("button", { name: "Deleting…" })).toBeDisabled();
    resolveDelete();
  });

  it("shows an error and a Retry control when onDelete rejects", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const onDelete = vi
      .fn()
      .mockRejectedValueOnce(new Error("Cannot delete: in use"))
      .mockResolvedValueOnce(undefined);
    render(<DeleteButton onDelete={onDelete} confirmMessage="Delete this item?" />);

    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.getByText("Cannot delete: in use")).toBeInTheDocument());
    const retryButton = screen.getByRole("button", { name: "Retry" });

    await user.click(retryButton);

    expect(onDelete).toHaveBeenCalledTimes(2);
  });

  it("uses custom label and pendingLabel when given", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(
      <DeleteButton
        onDelete={onDelete}
        confirmMessage="Remove?"
        label="Remove from saved"
        pendingLabel="Removing…"
      />,
    );

    expect(screen.getByRole("button", { name: "Remove from saved" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove from saved" }));
    expect(onDelete).toHaveBeenCalled();
  });
});
