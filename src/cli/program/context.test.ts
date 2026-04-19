import { describe, expect, it, vi } from "vitest";
import { createProgramContext } from "./context.js";

vi.mock("../../version.js", () => ({
  VERSION: "9.9.9-test",
}));

describe("createProgramContext", () => {
  it("builds program context from the version only", () => {
    expect(createProgramContext()).toEqual({
      programVersion: "9.9.9-test",
    });
  });
});
