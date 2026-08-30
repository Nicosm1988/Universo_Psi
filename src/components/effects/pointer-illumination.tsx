"use client";

import { useEffect, useRef } from "react";

const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function PointerIllumination() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentGlow = glowRef.current;
    if (!currentGlow) return;
    const glow: HTMLDivElement = currentGlow;

    const finePointer = window.matchMedia(FINE_POINTER_QUERY);
    const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);
    let activeTarget: HTMLElement | null = null;
    let frameId = 0;
    let pointerX = 0;
    let pointerY = 0;

    function hide() {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
      glow.removeAttribute("data-visible");
      clearActiveTarget();
    }

    function clearActiveTarget() {
      if (!activeTarget) return;

      activeTarget.removeAttribute("data-cursor-active");
      activeTarget.style.removeProperty("--cursor-x");
      activeTarget.style.removeProperty("--cursor-y");
      activeTarget = null;
    }

    function paintPointer() {
      frameId = 0;
      glow.style.setProperty(
        "transform",
        `translate3d(${pointerX}px, ${pointerY}px, 0)`,
      );
      glow.dataset.visible = "true";

      const hoveredElement = document.elementFromPoint(pointerX, pointerY);
      const nextTarget = hoveredElement?.closest<HTMLElement>(
        "[data-cursor-glow]",
      ) ?? null;

      if (nextTarget !== activeTarget) {
        clearActiveTarget();
        activeTarget = nextTarget;
        activeTarget?.setAttribute("data-cursor-active", "true");
      }

      if (!activeTarget) return;

      const bounds = activeTarget.getBoundingClientRect();
      activeTarget.style.setProperty(
        "--cursor-x",
        `${pointerX - bounds.left}px`,
      );
      activeTarget.style.setProperty(
        "--cursor-y",
        `${pointerY - bounds.top}px`,
      );
    }

    function onPointerMove(event: PointerEvent) {
      if (event.pointerType !== "mouse") {
        hide();
        return;
      }

      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!frameId) frameId = window.requestAnimationFrame(paintPointer);
    }

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") hide();
    }

    function disable() {
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", hide);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", hide);
      hide();
    }

    function configure() {
      disable();
      if (!finePointer.matches || reducedMotion.matches) return;

      window.addEventListener("pointermove", onPointerMove, { passive: true });
      document.addEventListener("pointerleave", hide, { passive: true });
      document.addEventListener("visibilitychange", onVisibilityChange);
      window.addEventListener("blur", hide);
    }

    configure();
    finePointer.addEventListener("change", configure);
    reducedMotion.addEventListener("change", configure);

    return () => {
      disable();
      finePointer.removeEventListener("change", configure);
      reducedMotion.removeEventListener("change", configure);
    };
  }, []);

  return <div ref={glowRef} className="pointer-illumination" aria-hidden="true" />;
}
