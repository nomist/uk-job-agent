// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MockDataNotice } from "@/components/jobs/mock-data-notice";

describe("MockDataNotice", () => {
  it("shows the sample-data explanation", () => {
    render(<MockDataNotice />);
    expect(
      screen.getByText("Showing sample jobs because API keys are not configured."),
    ).toBeInTheDocument();
  });
});
