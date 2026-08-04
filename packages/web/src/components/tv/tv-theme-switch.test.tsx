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
    const darkTheme = screen.getByRole("link", { name: "Tema escuro" });
    const lightTheme = screen.getByRole("link", { name: "Tema claro" });

    expect(darkTheme.getAttribute("href")).toBe("/tv");
    expect(darkTheme.getAttribute("title")).toBe("Tema escuro");
    expect(darkTheme.getAttribute("aria-current")).toBe("page");
    expect(lightTheme.getAttribute("href")).toBe("/tv?theme=light");
    expect(lightTheme.getAttribute("title")).toBe("Tema claro");
    expect(lightTheme.hasAttribute("aria-current")).toBe(false);
  });

  it("marca o tema claro", () => {
    render(<TvThemeSwitch theme="light" />);

    expect(screen.getByRole("link", { name: "Tema claro" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Tema escuro" }).hasAttribute("aria-current")).toBe(false);
  });

  it("preserva o tema na rota da TV Comercial", () => {
    render(<TvThemeSwitch theme="light" basePath="/commercial/tv" />);
    expect(screen.getByRole("link", { name: "Tema escuro" }).getAttribute("href")).toBe("/commercial/tv");
    expect(screen.getByRole("link", { name: "Tema claro" }).getAttribute("href")).toBe("/commercial/tv?theme=light");
  });
});
