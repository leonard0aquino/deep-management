import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

describe("useAutoRefresh", () => {
  beforeEach(() => { vi.useFakeTimers(); refresh.mockClear(); Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" }); });
  it("atualiza no intervalo e reinicia manualmente", () => {
    const { result } = renderHook(() => useAutoRefresh(2));
    act(() => vi.advanceTimersByTime(2000));
    expect(refresh).toHaveBeenCalledTimes(1);
    act(() => result.current.refreshNow());
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(result.current.seconds).toBe(2);
  });
  it("pausa ticks com a aba oculta", () => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    const { result } = renderHook(() => useAutoRefresh(2));
    act(() => vi.advanceTimersByTime(5000));
    expect(refresh).not.toHaveBeenCalled();
    expect(result.current.paused).toBe(true);
  });
  it("retoma sem acumular ticks ao voltar para a aba visível", () => {
    const { result } = renderHook(() => useAutoRefresh(2));
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.seconds).toBe(1);
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    act(() => vi.advanceTimersByTime(5000));
    expect(refresh).not.toHaveBeenCalled();
    expect(result.current.seconds).toBe(1);
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(result.current.paused).toBe(false);
    act(() => vi.advanceTimersByTime(1000));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
