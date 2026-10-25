import { describe, expect, it } from "vitest";
import { parseTheme } from "../src/utils/theme";

describe("主题选择", () => {
  it.each(["original", "green", "red"])("保留已选择的 %s 主题", (theme) => {
    expect(parseTheme(theme)).toBe(theme);
  });

  it.each([null, "", "unknown"])("无有效偏好时使用绿色主题：%s", (value) => {
    expect(parseTheme(value)).toBe("green");
  });
});
