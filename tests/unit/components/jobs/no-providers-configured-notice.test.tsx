// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NoProvidersConfiguredNotice } from "@/components/jobs/no-providers-configured-notice";

describe("NoProvidersConfiguredNotice", () => {
  it("explains that no job search providers are configured and names the env vars to set", () => {
    render(<NoProvidersConfiguredNotice />);
    expect(screen.getByText(/no job search providers are configured/i)).toBeInTheDocument();
    expect(screen.getByText(/ADZUNA_APP_ID/)).toBeInTheDocument();
    expect(screen.getByText(/REED_API_KEY/)).toBeInTheDocument();
  });
});
