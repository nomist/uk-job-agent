// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ResumeUploadForm } from "@/components/resumes/resume-upload-form";

describe("ResumeUploadForm", () => {
  it("submits the typed label and content", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<ResumeUploadForm onCreate={onCreate} />);

    await user.type(screen.getByLabelText(/label/i), "General");
    await user.type(screen.getByLabelText(/resume content/i), "My resume content");
    await user.click(screen.getByRole("button", { name: /add resume/i }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith("General", "My resume content"));
  });

  it("clears the form after a successful submission", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<ResumeUploadForm onCreate={onCreate} />);

    await user.type(screen.getByLabelText(/label/i), "General");
    await user.type(screen.getByLabelText(/resume content/i), "content");
    await user.click(screen.getByRole("button", { name: /add resume/i }));

    await waitFor(() => expect(screen.getByLabelText(/label/i)).toHaveValue(""));
    expect(screen.getByLabelText(/resume content/i)).toHaveValue("");
  });

  it("loads a .txt file's contents into the textarea and derives a label from the filename", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<ResumeUploadForm onCreate={onCreate} />);

    const file = new File(["Resume text from file"], "frontend-resume.txt", { type: "text/plain" });
    await user.upload(screen.getByLabelText(/upload a text file/i), file);

    await waitFor(() =>
      expect(screen.getByLabelText(/resume content/i)).toHaveValue("Resume text from file"),
    );
    expect(screen.getByLabelText(/label/i)).toHaveValue("frontend-resume");
  });

  it("does not overwrite a label the user already typed when a file is uploaded", async () => {
    const user = userEvent.setup();
    render(<ResumeUploadForm onCreate={vi.fn()} />);

    await user.type(screen.getByLabelText(/label/i), "My custom label");
    const file = new File(["content"], "ignored-name.txt", { type: "text/plain" });
    await user.upload(screen.getByLabelText(/upload a text file/i), file);

    await waitFor(() => expect(screen.getByLabelText(/resume content/i)).toHaveValue("content"));
    expect(screen.getByLabelText(/label/i)).toHaveValue("My custom label");
  });

  it("shows a friendly error message on failure", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn().mockRejectedValueOnce(new Error("Failed to save resume"));
    render(<ResumeUploadForm onCreate={onCreate} />);

    await user.type(screen.getByLabelText(/label/i), "General");
    await user.type(screen.getByLabelText(/resume content/i), "content");
    await user.click(screen.getByRole("button", { name: /add resume/i }));

    await waitFor(() => expect(screen.getByText("Failed to save resume")).toBeInTheDocument());
  });
});
