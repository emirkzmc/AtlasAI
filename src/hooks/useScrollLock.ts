import { useEffect, useRef } from "react";

/**
 * Body ve tüm scrollable container'ların scroll'unu kilitler / serbest bırakır.
 *
 * Çözülen sorunlar:
 * - Modal açıkken dikey ve yatay scroll engellenir (body + iç container'lar)
 * - Scrollbar kaybolunca oluşan layout shift, padding-right ile telafi edilir
 * - Birden fazla modal aynı anda açıksa, ancak hepsi kapandığında kilit kalkar (ref-counting)
 * - Cleanup ile memory leak önlenir
 *
 * @param isLocked - `true` ise scroll kilitlenir, `false` ise serbest kalır
 */

/** Aynı anda kaç tane aktif kilit olduğunu takip eder */
let activeLockCount = 0;

/** Kilitlenen container'ların orijinal stillerini saklar */
const savedContainerStyles = new Map<
  HTMLElement,
  { overflow: string; overflowX: string; overflowY: string }
>();

interface SavedBodyStyles {
  overflow: string;
  overflowX: string;
  overflowY: string;
  paddingRight: string;
}

let savedBodyStyles: SavedBodyStyles | null = null;

function lockScroll(): void {
  const body = document.body;
  const scrollbarWidth =
    window.innerWidth - document.documentElement.clientWidth;

  // Body stillerini kaydet ve kilitle
  savedBodyStyles = {
    overflow: body.style.overflow,
    overflowX: body.style.overflowX,
    overflowY: body.style.overflowY,
    paddingRight: body.style.paddingRight,
  };

  body.style.overflow = "hidden";
  body.style.overflowX = "hidden";
  body.style.overflowY = "hidden";

  if (scrollbarWidth > 0) {
    body.style.paddingRight = `${scrollbarWidth}px`;
  }

  // overflow-y-auto veya overflow-y-scroll olan tüm container'ları bul ve kilitle
  const scrollableContainers = document.querySelectorAll<HTMLElement>(
    '[class*="overflow-y-auto"], [class*="overflow-y-scroll"]'
  );

  scrollableContainers.forEach((el) => {
    // Modal'ın kendi içindeki scrollable alanları atla
    if (el.closest('[role="dialog"]') || el.closest(".atlasai-ai-modal")) {
      return;
    }

    savedContainerStyles.set(el, {
      overflow: el.style.overflow,
      overflowX: el.style.overflowX,
      overflowY: el.style.overflowY,
    });

    el.style.overflow = "hidden";
    el.style.overflowX = "hidden";
    el.style.overflowY = "hidden";
  });
}

function unlockScroll(): void {
  const body = document.body;

  // Body stillerini geri yükle
  if (savedBodyStyles) {
    body.style.overflow = savedBodyStyles.overflow;
    body.style.overflowX = savedBodyStyles.overflowX;
    body.style.overflowY = savedBodyStyles.overflowY;
    body.style.paddingRight = savedBodyStyles.paddingRight;
    savedBodyStyles = null;
  }

  // Container stillerini geri yükle
  savedContainerStyles.forEach((styles, el) => {
    el.style.overflow = styles.overflow;
    el.style.overflowX = styles.overflowX;
    el.style.overflowY = styles.overflowY;
  });
  savedContainerStyles.clear();
}

export function useScrollLock(isLocked: boolean): void {
  // Ref ile önceki isLocked değerini izle — strict mode double-invoke'a karşı koruma
  const wasLockedRef = useRef(false);

  useEffect(() => {
    if (isLocked && !wasLockedRef.current) {
      if (activeLockCount === 0) {
        lockScroll();
      }
      activeLockCount += 1;
      wasLockedRef.current = true;
    }

    return () => {
      if (wasLockedRef.current) {
        activeLockCount -= 1;
        wasLockedRef.current = false;

        if (activeLockCount === 0) {
          unlockScroll();
        }
      }
    };
  }, [isLocked]);
}
