import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { normalizeTvTheme, TvThemeSwitch } from "@/components/tv/tv-theme-switch";

afterEach(cleanup);

describe("normalizeTvTheme", () => {
  it("aceita somente o tema claro e usa o escuro como fallback", () => {
    expect(normalizeTvTheme("light")).toBe("light");
    expect(normalizeTvTheme()).toBe("dark");
    expect(normalizeTvTheme("dark")).toBe("dark");
    expect(normalizeTvTheme("desconhecido")).toBe("dark");
    expect(normalizeTvTheme(["light"])).toBe("dark");
  });
});

describe("TvThemeSwitch", () => {
  it("marca o tema escuro e aponta a alternativa para a URL clara", () => {
    render(<TvThemeSwitch theme="dark" />);

    expect(screen.getByRole("navigation", { name: "Escolher tema do Modo TV" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Escura" }).getAttribute("href")).toBe("/tv");
    expect(screen.getByRole("link", { name: "Escura" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Clara" }).getAttribute("href")).toBe("/tv?theme=light");
    expect(screen.getByRole("link", { name: "Clara" }).hasAttribute("aria-current")).toBe(false);
  });

  it("marca o tema claro", () => {
    render(<TvThemeSwitch theme="light" />);

    expect(screen.getByRole("link", { name: "Clara" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Escura" }).hasAttribute("aria-current")).toBe(false);
  });
});
