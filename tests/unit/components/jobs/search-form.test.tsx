// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SearchForm } from "@/components/jobs/search-form";

describe("SearchForm", () => {
  it("calls onSearch with trimmed keyword and location on submit", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(<SearchForm onSearch={onSearch} />);

    await user.type(screen.getByPlaceholderText(/job title, skill, or company/i), "  engineer  ");
    await user.type(screen.getByPlaceholderText(/location/i), "  London  ");
    await user.click(screen.getByRole("button", { name: /search/i }));

    expect(onSearch).toHaveBeenCalledWith({ q: "engineer", location: "London" });
  });

  it("submits empty strings when both fields are left blank", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(<SearchForm onSearch={onSearch} />);

    await user.click(screen.getByRole("button", { name: /search/i }));

    expect(onSearch).toHaveBeenCalledWith({ q: "", location: "" });
  });

  it("disables the submit button and shows a searching label when disabled", () => {
    render(<SearchForm onSearch={vi.fn()} disabled />);

    const button = screen.getByRole("button", { name: /searching/i });
    expect(button).toBeDisabled();
  });
});
