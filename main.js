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
  var loadingEl = document.getElementById("site-loading");
  var loadingPercentEl = document.getElementById("site-loading-percent");
  var criticalImageSrcs = [
    "./assets/branding/dream_echo_logo_transparent.png",
    "./assets/fx/clouds/cloud_far.png",
    "./assets/fx/clouds/cloud_mid.png",
    "./assets/fx/clouds/cloud_near.png",
    "./assets/fx/clouds/vignette.png",
    "./assets/fx/clouds/lightning_glow.png",
    "./assets/fx/fog/fog_a.png",
    "./assets/fx/fog/fog_b.png",
    "./assets/bg/city_distant_atmosphere.svg",
  ];
  var loadingDisplayed = 0;
  var loadingTarget = 0;
  var loadingRaf = null;

  function updateLoadingPercent(nextValue) {
    loadingTarget = Math.max(loadingTarget, Math.min(100, Math.round(nextValue)));
    if (loadingRaf) return;
    function step() {
      if (!loadingPercentEl) {
        loadingRaf = null;
        return;
      }
      if (loadingDisplayed < loadingTarget) {
        var delta = Math.max(1, Math.ceil((loadingTarget - loadingDisplayed) * 0.18));
        loadingDisplayed = Math.min(loadingTarget, loadingDisplayed + delta);
        loadingPercentEl.textContent = loadingDisplayed + "%";
        loadingRaf = window.requestAnimationFrame(step);
      } else {
        loadingRaf = null;
      }
    }
    loadingRaf = window.requestAnimationFrame(step);
  }

  function resolveAssetUrl(src) {
    return new URL(src, window.location.href).href;
  }

  function withTimeout(promise, ms) {
    var timer;
    var timeout = new Promise(function (resolve) {
      timer = window.setTimeout(function () {
        resolve({ ok: false, timedOut: true });
      }, ms);
    });
    return Promise.race([promise, timeout]).then(function (result) {
      window.clearTimeout(timer);
      return result;
    });
  }

  function preloadImage(src) {
    return withTimeout(
      new Promise(function (resolve) {
        var img = new Image();
        img.decoding = "async";
        img.onload = function () {
          if (img.decode) {
            img.decode().then(function () {
              resolve({ ok: true, src: src });
            }).catch(function () {
              resolve({ ok: true, src: src });
            });
          } else {
            resolve({ ok: true, src: src });
          }
        };
        img.onerror = function () {
          resolve({ ok: false, src: src });
        };
        img.src = resolveAssetUrl(src);
      }),
      9000
    );
  }

  function preloadAudioElement(audio) {
    if (!audio) return Promise.resolve({ ok: true, src: "audio:none" });
    if (audio.readyState >= 2) return Promise.resolve({ ok: true, src: "audio:ready" });
    return withTimeout(
      new Promise(function (resolve) {
        var done = false;
        function finish(ok) {
          if (done) return;
          done = true;
          audio.removeEventListener("canplay", onReady);
          audio.removeEventListener("loadeddata", onReady);
          audio.removeEventListener("error", onError);
          resolve({ ok: ok, src: "audio" });
        }
        function onReady() {
          finish(true);
        }
        function onError() {
          finish(false);
        }
        audio.addEventListener("canplay", onReady, { once: true });
        audio.addEventListener("loadeddata", onReady, { once: true });
        audio.addEventListener("error", onError, { once: true });
        try {
          audio.load();
        } catch (err) {
          finish(false);
        }
      }),
      7000
    );
  }

  function preloadFonts() {
    if (!document.fonts || !document.fonts.ready) {
      return Promise.resolve({ ok: true, src: "fonts:unsupported" });
    }
    return withTimeout(
      document.fonts.ready.then(function () {
        return { ok: true, src: "fonts" };
      }).catch(function () {
        return { ok: false, src: "fonts" };
      }),
      5000
    );
  }

  function showBgmConsentAfterLoading() {
    if (loadingEl) {
      loadingEl.classList.add("site-loading--done");
      window.setTimeout(function () {
        loadingEl.setAttribute("hidden", "");
      }, 420);
    }
    html.classList.remove("app-loading");
    html.classList.add("app-awaiting-choice");
    if (consentEl) {
      consentEl.classList.remove("bgm-consent--pending");
      consentEl.removeAttribute("aria-hidden");
    }
    if (consentAccept) {
      window.requestAnimationFrame(function () {
        window.setTimeout(function () {
          try {
            consentAccept.focus({ preventScroll: true });
          } catch (err) {}
        }, 80);
      });
    }
  }

  function startInitialLoading() {
    updateLoadingPercent(0);
    var tasks = criticalImageSrcs.map(preloadImage);
    tasks.push(preloadAudioElement(bgmAudio));
    tasks.push(preloadFonts());
    var total = tasks.length;
    var completed = 0;

    tasks.forEach(function (task) {
      task.then(function () {
        completed += 1;
        updateLoadingPercent((completed / total) * 100);
      });
    });

    Promise.all(tasks).then(function () {
      updateLoadingPercent(100);
      window.setTimeout(showBgmConsentAfterLoading, 260);
    });
  }

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
    html.classList.remove("app-awaiting-choice");
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
  startInitialLoading();

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
  var imageEl = document.getElementById("char-modal-image");
  var closeEls = modal ? modal.querySelectorAll("[data-close-modal]") : [];

  function openModal(key, btn) {
    var tpl = document.getElementById("char-tpl-" + key);
    if (!tpl || !bodyEl || !modal) return;
    var name = btn.getAttribute("data-char-name");
    var image = btn.getAttribute("data-char-image");
    var tarot = btn.querySelector(".char-card__tarot");
    var quote = btn.querySelector(".char-card__quote");

    bodyEl.innerHTML = "";
    bodyEl.appendChild(tpl.content.cloneNode(true));
    if (titleEl) titleEl.textContent = name || "";
    if (tarotEl) {
      tarotEl.textContent = tarot ? tarot.textContent.trim() : "";
      tarotEl.hidden = !tarot;
    }
    if (quoteEl) quoteEl.textContent = quote ? quote.textContent.trim() : "";
    if (imageEl) {
      imageEl.src = image || "";
      imageEl.alt = name ? name + "角色设定图" : "";
    }

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
    if (imageEl) {
      imageEl.removeAttribute("src");
      imageEl.alt = "";
    }
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
      if (
        consentEl &&
        !consentEl.classList.contains("bgm-consent--pending") &&
        !consentEl.classList.contains("bgm-consent--dismissed") &&
        e.key === "Escape"
      ) {
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
