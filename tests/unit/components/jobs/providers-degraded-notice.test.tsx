// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProvidersDegradedNotice } from "@/components/jobs/providers-degraded-notice";

describe("ProvidersDegradedNotice", () => {
  it("renders nothing when no provider failed", () => {
    const { container } = render(<ProvidersDegradedNotice failedProviders={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("names a single failed provider using its friendly label", () => {
    render(<ProvidersDegradedNotice failedProviders={["REED"]} />);
    expect(screen.getByText(/reed is temporarily unavailable/i)).toBeInTheDocument();
  });

  it("names multiple failed providers, joined with 'and'", () => {
    render(<ProvidersDegradedNotice failedProviders={["ADZUNA", "REED"]} />);
    expect(screen.getByText(/adzuna and reed are temporarily unavailable/i)).toBeInTheDocument();
  });

  it("falls back to the raw provider name for an unrecognized provider", () => {
    render(<ProvidersDegradedNotice failedProviders={["MOCK"]} />);
    expect(screen.getByText(/mock is temporarily unavailable/i)).toBeInTheDocument();
  });
});
