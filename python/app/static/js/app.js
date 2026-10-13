/* AeroRoute AI — minimal vanilla JS enhancements (no framework) */
(function () {
  "use strict";

  function onReady(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  /* ---------------------------------------------------------------- */
  /* UTC clock (console navbar)                                        */
  /* ---------------------------------------------------------------- */
  function startClock() {
    var el = document.querySelector("[data-utc-clock]");
    if (!el) return;
    function tick() {
      el.textContent = new Date().toUTCString().replace("GMT", "UTC");
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ---------------------------------------------------------------- */
  /* Sidebar collapse + mobile drawer                                  */
  /* ---------------------------------------------------------------- */
  function setupSidebar() {
    var asides = document.querySelectorAll("[data-sidebar]");
    var overlay = document.querySelector("[data-sidebar-overlay]");
    var mobileToggle = document.querySelector("[data-sidebar-open]");
    var closers = document.querySelectorAll("[data-sidebar-close]");

    function setCollapsed(collapsed) {
      document.body.classList.toggle("sidebar-collapsed", collapsed);
      asides.forEach(function (a) {
        a.style.width = collapsed ? "76px" : "256px";
      });
      document.querySelectorAll("[data-collapse-hide]").forEach(function (n) {
        n.classList.toggle("hidden", collapsed);
      });
      var icons = document.querySelectorAll("[data-collapse-icon]");
      icons.forEach(function (n) {
        n.classList.toggle("hidden", collapsed);
      });
      var openIcon = document.querySelector("[data-collapse-open-icon]");
      var closeIcon = document.querySelector("[data-collapse-close-icon]");
      if (openIcon) openIcon.classList.toggle("hidden", !collapsed);
      if (closeIcon) closeIcon.classList.toggle("hidden", collapsed);
    }

    document.querySelectorAll("[data-collapse-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setCollapsed(!document.body.classList.contains("sidebar-collapsed"));
      });
    });

    function openMobile() {
      if (overlay) overlay.classList.remove("hidden");
      var drawer = document.querySelector("[data-mobile-drawer]");
      if (drawer) {
        drawer.classList.remove("hidden");
        drawer.classList.remove("-translate-x-full");
      }
    }
    function closeMobile() {
      if (overlay) overlay.classList.add("hidden");
      var drawer = document.querySelector("[data-mobile-drawer]");
      if (drawer) {
        drawer.classList.add("hidden");
        drawer.classList.add("-translate-x-full");
      }
    }

    if (mobileToggle) mobileToggle.addEventListener("click", openMobile);
    closers.forEach(function (c) {
      c.addEventListener("click", closeMobile);
    });
    if (overlay) overlay.addEventListener("click", closeMobile);
  }

  /* ---------------------------------------------------------------- */
  /* Public navbar scroll state + mobile menu                          */
  /* ---------------------------------------------------------------- */
  function setupPublicNav() {
    var header = document.querySelector("[data-public-nav]");
    if (header) {
      function onScroll() {
        var scrolled = window.scrollY > 12;
        header.classList.toggle("glass", scrolled);
        header.classList.toggle("border-b", scrolled);
        header.classList.toggle("border-white/5", scrolled);
        header.classList.toggle("shadow-lg", scrolled);
        header.classList.toggle("shadow-black/20", scrolled);
        header.classList.toggle("bg-transparent", !scrolled);
      }
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    var toggle = document.querySelector("[data-public-menu-toggle]");
    var menu = document.querySelector("[data-public-menu]");
    if (toggle && menu) {
      toggle.addEventListener("click", function () {
        menu.classList.toggle("hidden");
        var open = !menu.classList.contains("hidden");
        var menuIcon = document.querySelector("[data-public-icon-menu]");
        var xIcon = document.querySelector("[data-public-icon-x]");
        if (menuIcon) menuIcon.classList.toggle("hidden", open);
        if (xIcon) xIcon.classList.toggle("hidden", !open);
      });
    }
  }

  /* ---------------------------------------------------------------- */
  /* Reveal on scroll                                                  */
  /* ---------------------------------------------------------------- */
  function setupReveal() {
    var els = document.querySelectorAll(".reveal");
    if (!els.length) return;
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (el) {
        el.classList.add("is-visible");
      });
      return;
    }
    var obs = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var delay = entry.target.getAttribute("data-delay");
            if (delay) entry.target.style.transitionDelay = delay + "ms";
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    els.forEach(function (el) {
      obs.observe(el);
    });
  }

  /* ---------------------------------------------------------------- */
  /* Range slider live value labels (route optimizer)                  */
  /* ---------------------------------------------------------------- */
  function setupSliders() {
    document.querySelectorAll("[data-weight-slider]").forEach(function (slider) {
      var output = document.querySelector('[data-weight-value="' + slider.name + '"]');
      function update() {
        if (output) output.textContent = parseFloat(slider.value).toFixed(2);
        updateTotal();
      }
      slider.addEventListener("input", update);
      if (output) output.textContent = parseFloat(slider.value).toFixed(2);
    });

    function updateTotal() {
      var total = 0;
      document.querySelectorAll("[data-weight-slider]").forEach(function (s) {
        total += parseFloat(s.value);
      });
      var el = document.querySelector("[data-weight-total]");
      if (el) {
        el.textContent = total.toFixed(2);
        el.classList.toggle("text-amber-300", Math.abs(total - 1) > 0.01);
        el.classList.toggle("text-emerald-300", Math.abs(total - 1) <= 0.01);
      }
    }
    updateTotal();
  }

  /* ---------------------------------------------------------------- */
  /* Premium: scroll progress + cursor light                           */
  /* ---------------------------------------------------------------- */
  function setupAmbient(fine, reduce) {
    var bar = document.getElementById("scroll-progress");
    var glow = document.getElementById("cursor-glow");
    var ticking = false;
    var host = document.querySelector("main.overflow-y-auto") || window;

    function onScroll() {
      if (bar) {
        var top, view, total;
        if (host === window) {
          top = window.scrollY;
          view = window.innerHeight;
          total = document.documentElement.scrollHeight;
        } else {
          top = host.scrollTop;
          view = host.clientHeight;
          total = host.scrollHeight;
        }
        var h = total - view;
        var pct = h > 0 ? (top / h) * 100 : 0;
        bar.style.width = Math.min(100, Math.max(0, pct)) + "%";
      }
      ticking = false;
    }
    host.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(onScroll);
        }
      },
      { passive: true }
    );
    onScroll();

    if (glow && fine && !reduce) {
      var gx = 0,
        gy = 0,
        cx = 0,
        cy = 0,
        active = false;
      window.addEventListener("pointermove", function (e) {
        gx = e.clientX;
        gy = e.clientY;
        if (!active) {
          active = true;
          glow.style.opacity = "1";
        }
      });
      (function loop() {
        cx += (gx - cx) * 0.12;
        cy += (gy - cy) * 0.12;
        glow.style.transform = "translate3d(" + cx + "px," + cy + "px,0)";
        requestAnimationFrame(loop);
      })();
    }
  }

  /* ---------------------------------------------------------------- */
  /* Premium: pointer-driven 3D tilt + glare on cards                  */
  /* ---------------------------------------------------------------- */
  function setupTilt(reduce, fine) {
    if (reduce || !fine) return;
    var nodes = document.querySelectorAll(
      '[class*="rounded-2xl"], [class*="rounded-3xl"], [class*="rounded-xl"]'
    );
    var bound = [];
    nodes.forEach(function (el) {
      if (el.closest(".leaflet-container")) return;
      if (el.dataset.tiltBound) return;
      if (el.querySelector(".leaflet-container")) return;
      var tag = el.tagName;
      if (tag === "BUTTON" || tag === "INPUT" || tag === "SELECT" ||
          tag === "TEXTAREA" || tag === "TABLE" || tag === "THEAD" ||
          tag === "TBODY" || tag === "TR" || tag === "TD" || tag === "TH") return;
      var display = getComputedStyle(el).display;
      if (display === "inline" || display === "contents") return;
      var r = el.getBoundingClientRect();
      if (r.width < 170 || r.height < 96 || r.width > 1100 || r.height > 1100) return;
      if (el.querySelector('[data-tilt-skip]')) return;
      bound.push(el);
    });

    bound.forEach(function (el) {
      el.dataset.tiltBound = "1";
      el.classList.add("tilt-card");
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      var glare = document.createElement("div");
      glare.className = "glare";
      glare.setAttribute("aria-hidden", "true");
      el.appendChild(glare);

      var tx = 0,
        ty = 0,
        curX = 0,
        curY = 0,
        raf = null;

      function loop() {
        curX += (tx - curX) * 0.16;
        curY += (ty - curY) * 0.16;
        el.style.transform =
          "perspective(950px) rotateX(" + curY.toFixed(2) + "deg) rotateY(" +
          curX.toFixed(2) + "deg)";
        if (Math.abs(tx - curX) > 0.02 || Math.abs(ty - curY) > 0.02) {
          raf = requestAnimationFrame(loop);
        } else {
          raf = null;
        }
      }
      el.addEventListener("pointermove", function (e) {
        var rect = el.getBoundingClientRect();
        var px = (e.clientX - rect.left) / rect.width;
        var py = (e.clientY - rect.top) / rect.height;
        tx = (px - 0.5) * 7;
        ty = (0.5 - py) * 7;
        el.classList.add("is-tilting");
        el.style.setProperty("--gx", (px * 100).toFixed(1) + "%");
        el.style.setProperty("--gy", (py * 100).toFixed(1) + "%");
        if (!raf) raf = requestAnimationFrame(loop);
      });
      el.addEventListener("pointerleave", function () {
        tx = 0;
        ty = 0;
        el.classList.remove("is-tilting");
        if (!raf) raf = requestAnimationFrame(loop);
      });
    });
  }

  /* ---------------------------------------------------------------- */
  /* Premium: count-up numbers ([data-count-to])                       */
  /* ---------------------------------------------------------------- */
  function setupCountUp(reduce) {
    var els = document.querySelectorAll("[data-count-to]");
    if (!els.length) return;
    function run(el) {
      var target = parseFloat(el.getAttribute("data-count-to"));
      if (isNaN(target)) return;
      var decimals = (el.getAttribute("data-count-decimals") || "0") | 0;
      var prefix = el.getAttribute("data-count-prefix") || "";
      var suffix = el.getAttribute("data-count-suffix") || "";
      if (reduce) {
        el.textContent = prefix + target.toFixed(decimals) + suffix;
        return;
      }
      var start = performance.now(),
        dur = 1400;
      (function step(now) {
        var t = Math.min(1, (now - start) / dur);
        var eased = 1 - Math.pow(1 - t, 3);
        el.textContent = prefix + (target * eased).toFixed(decimals) + suffix;
        if (t < 1) requestAnimationFrame(step);
      })(start);
    }
    if (!("IntersectionObserver" in window)) {
      els.forEach(run);
      return;
    }
    var obs = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            run(entry.target);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    els.forEach(function (el) {
      obs.observe(el);
    });
  }

  /* ---------------------------------------------------------------- */
  /* Premium: enhance Leaflet maps (radar sweep + marker/route anim)   */
  /* ---------------------------------------------------------------- */
  function setupMaps(reduce) {
    document.querySelectorAll(".leaflet-container").forEach(function (container) {
      if (!reduce && !container.querySelector(".map-radar")) {
        var radar = document.createElement("div");
        radar.className = "map-radar";
        radar.setAttribute("aria-hidden", "true");
        container.appendChild(radar);
      }
      var svg = container.querySelector(".leaflet-overlay-pane svg");
      if (!svg) return;
      svg.querySelectorAll("path").forEach(function (p) {
        var fill = p.getAttribute("fill");
        var stroke = (p.getAttribute("stroke") || "").toLowerCase();
        if (fill && fill !== "none") {
          p.classList.remove("route-animated", "corridor-line");
          p.classList.add("hub-pulse");
        } else if (stroke) {
          p.classList.remove("hub-pulse");
          if (stroke.indexOf("3b82f6") !== -1 || stroke.indexOf("38bdf8") !== -1 ||
              stroke.indexOf("22d3ee") !== -1 || stroke.indexOf("06b6d4") !== -1) {
            p.classList.add("route-animated");
            p.classList.remove("corridor-line");
          } else {
            p.classList.add("corridor-line");
            p.classList.remove("route-animated");
          }
        }
      });
    });
  }

  function setupPremium() {
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var fine = window.matchMedia("(pointer: fine)").matches;
    setupAmbient(fine, reduce);
    setupTilt(reduce, fine);
    setupCountUp(reduce);
    /* maps may init right after this; run twice to catch async tiles */
    setupMaps(reduce);
    setTimeout(function () {
      setupMaps(reduce);
    }, 900);
  }

  /* ---------------------------------------------------------------- */
  /* Init                                                              */
  /* ---------------------------------------------------------------- */
  onReady(function () {
    startClock();
    setupSidebar();
    setupPublicNav();
    setupReveal();
    setupSliders();
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
    if (window.AeroRouteCharts) window.AeroRouteCharts.init();
    if (window.AeroRouteMaps) window.AeroRouteMaps.init();
    setupPremium();
  });
})();
