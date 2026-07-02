// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { JobFilters, type JobFiltersValues } from "@/components/jobs/job-filters";

const BASE_VALUES: JobFiltersValues = { salaryMin: "", remoteOnly: false, provider: "" };

describe("JobFilters", () => {
  it("calls onChange with the updated salaryMin as the user types", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<JobFilters values={BASE_VALUES} onChange={onChange} />);

    await user.type(screen.getByLabelText(/min salary/i), "5");

    expect(onChange).toHaveBeenLastCalledWith({ ...BASE_VALUES, salaryMin: "5" });
  });

  it("calls onChange with remoteOnly toggled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<JobFilters values={BASE_VALUES} onChange={onChange} />);

    await user.click(screen.getByLabelText(/remote only/i));

    expect(onChange).toHaveBeenCalledWith({ ...BASE_VALUES, remoteOnly: true });
  });

  it("calls onChange with the selected provider", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<JobFilters values={BASE_VALUES} onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText(/provider/i), "REED");

    expect(onChange).toHaveBeenCalledWith({ ...BASE_VALUES, provider: "REED" });
  });

  it("disables all controls when disabled is true", () => {
    render(<JobFilters values={BASE_VALUES} onChange={vi.fn()} disabled />);

    expect(screen.getByLabelText(/min salary/i)).toBeDisabled();
    expect(screen.getByLabelText(/remote only/i)).toBeDisabled();
    expect(screen.getByLabelText(/provider/i)).toBeDisabled();
  });
});
