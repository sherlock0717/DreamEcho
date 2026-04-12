(function () {
  var prefersReducedMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Hero 雷闪：约 200ms 首闪 → 不规则较长间隔；偶发双闪；.hero--lightning 照亮雾/云（非整屏白） */
  var startHeroLightning = (function heroLightningRandom() {
    var started = false;
    var nextTimer = null;
    if (prefersReducedMotion) {
      return function () {};
    }
    var el = document.getElementById("hero-flash-js");
    var fill = document.getElementById("hero-flash-fill");
    var gate = document.getElementById("hero-gate");
    if (!el || !gate) {
      return function () {};
    }
    function setFlash(mainOp, fillOp) {
      el.style.opacity = String(mainOp);
      if (fill) fill.style.opacity = String(fillOp);
      if (mainOp > 0.04 || (fill && fillOp > 0.04)) {
        gate.classList.add("hero--lightning");
      } else {
        gate.classList.remove("hero--lightning");
      }
    }
    function flashOnce(first) {
      var strong = first ? 0.18 + Math.random() * 0.08 : 0.13 + Math.random() * 0.08;
      var fillStrong = strong * 0.35;
      setFlash(strong, fillStrong);
      window.setTimeout(function () {
        setFlash(strong * 0.38, fillStrong * 0.42);
        window.setTimeout(function () {
          setFlash(0, 0);
        }, 60 + Math.random() * 30);
      }, first ? 96 + Math.random() * 42 : 82 + Math.random() * 44);
      if (Math.random() < (first ? 0.24 : 0.14)) {
        window.setTimeout(function () {
          var w = strong * (0.34 + Math.random() * 0.12);
          var wf = w * 0.32;
          setFlash(w, wf);
          window.setTimeout(function () {
            setFlash(w * 0.3, wf * 0.35);
            window.setTimeout(function () {
              setFlash(0, 0);
            }, 48 + Math.random() * 18);
          }, 60 + Math.random() * 24);
        }, 180 + Math.random() * 120);
      }
    }
    function scheduleNext() {
      var delay = 5000 + Math.random() * 6500;
      if (Math.random() < 0.18) delay = 3200 + Math.random() * 1800;
      nextTimer = window.setTimeout(function () {
        flashOnce(false);
        scheduleNext();
      }, delay);
    }
    return function () {
      if (started) return;
      started = true;
      if (nextTimer) window.clearTimeout(nextTimer);
      window.setTimeout(function () {
        flashOnce(true);
        scheduleNext();
      }, 760 + Math.random() * 360);
    };
  })();

  var bgmAudio = document.getElementById("site-bgm");
  var musicBtn = document.getElementById("music-toggle");
  var bgmStarted = false;
  var consentEl = document.getElementById("bgm-consent");
  var consentAccept = document.getElementById("bgm-consent-accept");
  var consentDecline = document.getElementById("bgm-consent-decline");

  function syncMusicBtn() {
    if (!musicBtn || !bgmAudio) return;
    musicBtn.classList.toggle("music-toggle--playing", bgmStarted && !bgmAudio.paused);
  }

  function tryStartBgm() {
    if (!bgmAudio) {
      syncMusicBtn();
      return;
    }
    bgmAudio.volume = 0.16;
    var p = bgmAudio.play();
    if (p && p.then) {
      p.then(function () {
        bgmStarted = true;
        syncMusicBtn();
      }).catch(function () {
        syncMusicBtn();
      });
    } else {
      bgmStarted = true;
      syncMusicBtn();
    }
  }

  function dismissBgmConsent() {
    if (!consentEl) return;
    consentEl.classList.add("bgm-consent--dismissed");
    consentEl.setAttribute("aria-hidden", "true");
  }

  function completeSoundChoice(shouldPlay) {
    if (shouldPlay) {
      tryStartBgm();
    }
    dismissBgmConsent();
    startHeroLightning();
  }

  if (bgmAudio) {
    bgmAudio.volume = 0.16;
    bgmAudio.addEventListener("play", function () {
      bgmStarted = true;
      syncMusicBtn();
    });
    bgmAudio.addEventListener("pause", syncMusicBtn);
  }

  if (consentAccept) {
    consentAccept.addEventListener("click", function () {
      completeSoundChoice(true);
    });
  }
  if (consentDecline) {
    consentDecline.addEventListener("click", function () {
      completeSoundChoice(false);
    });
  }

  if (musicBtn) {
    musicBtn.addEventListener("click", function () {
      if (!bgmAudio) return;
      if (bgmAudio.paused) {
        tryStartBgm();
      } else {
        bgmAudio.pause();
      }
      syncMusicBtn();
    });
  }

  if (consentAccept) {
    window.requestAnimationFrame(function () {
      try {
        consentAccept.focus();
      } catch (err) {}
    });
  }

  var html = document.documentElement;
  var gatePassed = false;
  var hero = document.getElementById("hero-gate");

  function detachScrollBlockers() {
    window.removeEventListener("wheel", onWheel);
    window.removeEventListener("touchmove", onTouchMove);
  }

  function onWheel(e) {
    if (!gatePassed) e.preventDefault();
  }

  function onTouchMove(e) {
    if (!gatePassed) e.preventDefault();
  }

  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("touchmove", onTouchMove, { passive: false });

  /* 防止少数环境下仍出现滚动偏移 */
  function onScrollLock() {
    if (!gatePassed) window.scrollTo(0, 0);
  }
  window.addEventListener("scroll", onScrollLock, { passive: true });

  function finalizeGatePass() {
    if (gatePassed) return;
    gatePassed = true;
    window.removeEventListener("scroll", onScrollLock);
    detachScrollBlockers();
    html.classList.remove("gate-locked");
    html.classList.add("gate-passed");
    var mainEl = document.querySelector("main");
    var footerEl = document.getElementById("info");
    if (mainEl) mainEl.removeAttribute("inert");
    if (footerEl) footerEl.removeAttribute("inert");
    if (hero) {
      hero.classList.add("hero--dismissed");
    }
    window.scrollTo(0, 0);
    window.requestAnimationFrame(function () {
      var target = document.querySelector("#overview");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        try {
          target.focus({ preventScroll: true });
        } catch (err) {}
      }
    });
  }

  function beginGateExit() {
    if (!hero || gatePassed) return;
    hero.classList.add("hero--leaving");

    function onTransitionEnd(e) {
      if (e.target !== hero || e.propertyName !== "transform") return;
      hero.removeEventListener("transitionend", onTransitionEnd);
      finalizeGatePass();
    }

    hero.addEventListener("transitionend", onTransitionEnd);

    window.setTimeout(function () {
      if (!gatePassed) finalizeGatePass();
    }, 900);
  }

  var heroScroll = document.querySelector(".hero__scroll");
  if (heroScroll) {
    heroScroll.addEventListener("click", function (e) {
      e.preventDefault();
      beginGateExit();
    });
  }

  /* 角色弹窗 */
  var modal = document.getElementById("char-modal");
  var bodyEl = document.getElementById("char-modal-body");
  var titleEl = document.getElementById("char-dialog-title");
  var tarotEl = document.getElementById("char-modal-tarot");
  var quoteEl = document.getElementById("char-modal-quote");
  var closeEls = modal ? modal.querySelectorAll("[data-close-modal]") : [];

  function openModal(key, btn) {
    var tpl = document.getElementById("char-tpl-" + key);
    if (!tpl || !bodyEl || !modal) return;
    var name = btn.getAttribute("data-char-name");
    var tarot = btn.querySelector(".char-card__tarot");
    var quote = btn.querySelector(".char-card__quote");

    bodyEl.innerHTML = "";
    bodyEl.appendChild(tpl.content.cloneNode(true));
    if (titleEl) titleEl.textContent = name || "";
    if (tarotEl) tarotEl.textContent = tarot ? tarot.textContent.trim() : "";
    if (quoteEl) quoteEl.textContent = quote ? quote.textContent.trim() : "";

    modal.hidden = false;
    document.body.classList.add("modal-open");
    var closeBtn = modal.querySelector(".char-modal__close");
    if (closeBtn) closeBtn.focus();
  }

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    if (bodyEl) bodyEl.innerHTML = "";
    if (tarotEl) tarotEl.textContent = "";
    if (quoteEl) quoteEl.textContent = "";
  }

  document.querySelectorAll(".char-card").forEach(function (btn) {
    btn.addEventListener("click", function () {
      openModal(btn.getAttribute("data-char-key"), btn);
    });
  });

  closeEls.forEach(function (el) {
    el.addEventListener("click", function () {
      closeModal();
    });
  });

  document.addEventListener(
    "keydown",
    function (e) {
      if (modal && e.key === "Escape" && !modal.hidden) {
        e.preventDefault();
        closeModal();
        return;
      }
      if (consentEl && !consentEl.classList.contains("bgm-consent--dismissed") && e.key === "Escape") {
        e.preventDefault();
        completeSoundChoice(false);
        return;
      }
      if (gatePassed) return;
      var k = e.key;
      if (
        k === "ArrowDown" ||
        k === "ArrowUp" ||
        k === "PageDown" ||
        k === "PageUp" ||
        k === " " ||
        k === "Spacebar" ||
        k === "End" ||
        k === "Home"
      ) {
        e.preventDefault();
      }
    },
    { passive: false }
  );
})();
