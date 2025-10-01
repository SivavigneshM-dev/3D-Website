/* script.js
   Implements:
   - 3D parallax background (mouse hover on desktop; swipe on mobile)
   - custom cursor (halo + dot) + magnetic hover over interactive elements
   - lightweight trailing particles (canvas)
   - project card tilt on hover / touch
   - lightbox preview
*/

(() => {
  // Helpers & feature detection
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Elements
  const parallaxWrap = document.getElementById('parallax-wrap');
  const layers = Array.from(document.querySelectorAll('.parallax-layer'));
  const cursor = document.getElementById('cursor');
  const cursorDot = document.getElementById('cursor-dot');
  const cursorHalo = document.getElementById('cursor-halo');
  const trailCanvas = document.getElementById('trail-canvas');
  const portfolio = document.getElementById('portfolio');
  const projects = Array.from(document.querySelectorAll('.project'));
  const lightbox = document.getElementById('lightbox');
  const lightboxContent = document.getElementById('lightbox-content');
  const lightboxClose = document.getElementById('lightbox-close');
  const yearSpan = document.getElementById('year');
  const themeToggle = document.getElementById('theme-toggle');

  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  // Setup trail canvas
  let trailCtx, trailW, trailH;
  if (trailCanvas) {
    trailCtx = trailCanvas.getContext('2d', { alpha: true });
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  function resizeCanvas() {
    if (!trailCanvas) return;
    trailW = trailCanvas.width = innerWidth * devicePixelRatio;
    trailH = trailCanvas.height = innerHeight * devicePixelRatio;
    trailCanvas.style.width = innerWidth + 'px';
    trailCanvas.style.height = innerHeight + 'px';
    trailCtx && trailCtx.scale(devicePixelRatio, devicePixelRatio);
  }

  /* ---------------------------
     Parallax background logic
     - on desktop: reacts to mouse movement (center-based)
     - on mobile/touch: reacts to swipe / pan with inertia
     --------------------------- */
  let px = 0, py = 0; // normalized pointer -1..1
  let vx = 0, vy = 0; // velocity for smoothing / inertia

  function updateParallax() {
    // smooth movement
    vx += (px - vx) * 0.08;
    vy += (py - vy) * 0.08;

    layers.forEach(layer => {
      const depth = parseFloat(layer.dataset.depth || '0.1');
      const tx = vx * depth * 40; // px
      const ty = vy * depth * 40;
      // translate and slight rotate for 3D feel
      const rz = depth * 6;
      layer.style.transform = `translate3d(${tx}px, ${ty}px, 0) rotateZ(${rz}deg)`;
    });

    requestAnimationFrame(updateParallax);
  }
  if (!prefersReducedMotion) requestAnimationFrame(updateParallax);

  // Desktop mouse movement
  if (!isTouch && !prefersReducedMotion) {
    window.addEventListener('mousemove', (e) => {
      // normalize -1..1 based on center
      const cx = innerWidth / 2;
      const cy = innerHeight / 2;
      px = (e.clientX - cx) / cx;
      py = (e.clientY - cy) / cy;
      // update cursor
      moveCursor(e.clientX, e.clientY);
      spawnTrailParticle(e.clientX, e.clientY);
    });

    // When leaving window, gently reset
    window.addEventListener('mouseout', () => {
      px = 0; py = 0;
    });
  } else {
    // Mobile touch / swipe handling: track touchmove and apply inertia
    let lastTouchX = 0, lastTouchY = 0;
    let touchActive = false;
    let vxTouch = 0, vyTouch = 0;
    let lastTime = 0;

    window.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      lastTouchX = t.clientX; lastTouchY = t.clientY;
      touchActive = true;
      lastTime = e.timeStamp;
    }, {passive:true});

    window.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      const dt = Math.max(16, e.timeStamp - lastTime);
      vxTouch = (t.clientX - lastTouchX) / dt;
      vyTouch = (t.clientY - lastTouchY) / dt;
      lastTouchX = t.clientX; lastTouchY = t.clientY; lastTime = e.timeStamp;

      // map to -1..1
      px = (t.clientX - innerWidth/2) / (innerWidth/2);
      py = (t.clientY - innerHeight/2) / (innerHeight/2);

      // spawn few particles (but throttle)
      spawnTrailParticle(t.clientX, t.clientY);
    }, {passive:true});

    window.addEventListener('touchend', () => {
      touchActive = false;
      // let px,py decay to 0 via inertia already in updateParallax smoothing
    }, {passive:true});
  }

  /* ---------------------------
     Cursor: halo + dot + magnetic interactions
     --------------------------- */
  let cx = innerWidth / 2, cyPos = innerHeight / 2;
  let cursorVisible = true;
  function moveCursor(x, y) {
    if (!cursor) return;
    cx = x; cyPos = y;
    cursor.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%,-50%)`;
  }

  // Magnetic effect on hoverable elements (cards, buttons, links)
  const magnetSelectors = ['.project', '.btn', '.preview-btn', '.link', '.card'];
  const magnetEls = Array.from(document.querySelectorAll(magnetSelectors.join(',')));

  magnetEls.forEach(el => {
    // desktop: mouseenter/mousemove/mouseleave
    el.addEventListener('mouseenter', (e) => {
      el.classList.add('is-magnetic');
      if (!isTouch && !prefersReducedMotion) {
        // enlarge halo & dot
        cursorHalo.style.transform = 'scale(1.8)';
        cursorDot.style.transform = 'translate(-50%,-50%) scale(0.45)';
      }
    });
    el.addEventListener('mouseleave', () => {
      el.classList.remove('is-magnetic');
      cursorHalo.style.transform = 'scale(1)';
      cursorDot.style.transform = 'translate(-50%,-50%) scale(1)';
      // reset transform on element
      el.style.transform = '';
    });

    el.addEventListener('mousemove', (ev) => {
      if (isTouch || prefersReducedMotion) return;
      const rect = el.getBoundingClientRect();
      const relX = (ev.clientX - rect.left) - rect.width / 2;
      const relY = (ev.clientY - rect.top) - rect.height / 2;
      const pxEl = relX / (rect.width/2);
      const pyEl = relY / (rect.height/2);
      // tilt & translate card slightly towards cursor
      const tiltX = pyEl * -6; // rotateX
      const tiltY = pxEl * 6;  // rotateY
      const translateX = pxEl * 8;
      const translateY = pyEl * 8;
      el.style.transform = `perspective(900px) translate3d(${translateX}px, ${translateY}px, 6px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
      // attract cursor a little (halo shifts)
      const haloShiftX = pxEl * 8;
      const haloShiftY = pyEl * 6;
      cursorHalo.style.transform = `translate(${haloShiftX}px, ${haloShiftY}px) scale(1.9)`;
    });

    // mobile: tap to slightly pop (handled by CSS :focus + touch events)
    el.addEventListener('touchstart', () => {
      el.style.transform = `perspective(900px) translate3d(0, -6px, 6px) scale(1.01)`;
    }, {passive:true});
    el.addEventListener('touchend', () => {
      el.style.transform = '';
    }, {passive:true});
  });

  // Hide cursor when pointer leaves window
  window.addEventListener('mouseleave', () => {
    if (cursor) cursor.style.opacity = '0';
  });
  window.addEventListener('mouseenter', () => {
    if (cursor) cursor.style.opacity = '1';
  });

  /* ---------------------------
     Simple trail particle system
     - lightweight, spawns short-lived circles at pointer
     --------------------------- */
  const particles = [];
  function spawnTrailParticle(x, y) {
    if (!trailCtx || prefersReducedMotion) return;
    // throttle spawn
    if (Math.random() > 0.7) return;
    particles.push({
      x: x,
      y: y,
      life: 1,
      size: 6 + Math.random()*8,
      vx: (Math.random()-0.5) * 0.6,
      vy: (Math.random()-0.5) * 0.6,
      hue: 200 + Math.random()*120
    });
    if (particles.length > 200) particles.splice(0, particles.length - 150);
  }

  function updateTrail() {
    if (!trailCtx) return;
    trailCtx.clearRect(0,0,innerWidth,innerHeight);
    for (let i = particles.length-1; i >= 0; i--) {
      const p = particles[i];
      p.life -= 0.03 + Math.random()*0.01;
      p.x += p.vx * 6;
      p.y += p.vy * 6;
      const alpha = Math.max(0, p.life);
      trailCtx.beginPath();
      const grd = trailCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      grd.addColorStop(0, `hsla(${p.hue}, 90%, 60%, ${alpha})`);
      grd.addColorStop(1, `rgba(0,0,0,0)`);
      trailCtx.fillStyle = grd;
      trailCtx.globalCompositeOperation = 'lighter';
      trailCtx.fillRect(p.x - p.size, p.y - p.size, p.size*2, p.size*2);
      if (p.life <= 0) particles.splice(i,1);
    }
    requestAnimationFrame(updateTrail);
  }
  if (!prefersReducedMotion) requestAnimationFrame(updateTrail);

  /* ---------------------------
     Portfolio card keyboard + click handlers
     - opening lightbox preview
     --------------------------- */
  function openLightbox(title, desc) {
    lightboxContent.innerHTML = `
      <div style="padding:18px;">
        <h4>${escapeHtml(title)}</h4>
        <p style="color:var(--muted)">${escapeHtml(desc)}</p>
        <div style="height:320px; margin-top:12px; border-radius:8px; background:linear-gradient(120deg, rgba(124,58,237,0.12), rgba(6,182,212,0.08)); display:flex; align-items:center; justify-content:center;">
          <div style="color:rgba(255,255,255,0.9); font-weight:700;">Live preview placeholder</div>
        </div>
      </div>
    `;
    lightbox.setAttribute('aria-hidden','false');
    // focus trap simple: focus content
    lightboxContent.focus();
  }

  function closeLightbox() {
    lightbox.setAttribute('aria-hidden','true');
    lightboxContent.innerHTML = '';
  }

  // escape to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (lightbox.getAttribute('aria-hidden') === 'false') closeLightbox();
    }
  });

  // attach preview buttons
  portfolio.addEventListener('click', (e) => {
    const btn = e.target.closest('.preview-btn');
    if (btn) {
      const card = btn.closest('.project');
      const title = card.dataset.title || 'Preview';
      const desc = card.dataset.desc || '';
      openLightbox(title, desc);
    }
  });

  lightboxClose && lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  // keyboard activation of cards
  projects.forEach(card => {
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const title = card.dataset.title || 'Preview';
        const desc = card.dataset.desc || '';
        openLightbox(title, desc);
      }
    });
  });

  /* ---------------------------
     Project tilt on pointer move (desktop)
     --------------------------- */
  if (!isTouch && !prefersReducedMotion) {
    projects.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;
        const px = (relX / rect.width - 0.5) * 2; // -1..1
        const py = (relY / rect.height - 0.5) * 2;
        const rotX = py * -6;
        const rotY = px * 6;
        const tz = 14;
        card.style.transform = `perspective(900px) translate3d(${px*6}px, ${py*6}px, ${tz}px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
        // subtle shadow via box-shadow
        card.style.boxShadow = `${-px*6}px ${Math.abs(py)*8}px 28px rgba(2,6,23,0.45)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
        card.style.boxShadow = '';
      });
    });
  }

  /* ---------------------------
     Light performance-friendly animate loop for cursor halo breathing
     --------------------------- */
  if (!prefersReducedMotion) {
    let t = 0;
    function haloLoop() {
      t += 0.02;
      const s = 1 + Math.sin(t) * 0.05;
      if (cursorHalo) cursorHalo.style.opacity = (0.9 + Math.sin(t)*0.03).toString();
      if (cursorDot) cursorDot.style.boxShadow = `0 6px 14px rgba(0,0,0,${0.55 + Math.sin(t)*0.03})`;
      requestAnimationFrame(haloLoop);
    }
    requestAnimationFrame(haloLoop);
  }

  /* ---------------------------
     Utility: escape HTML
     --------------------------- */
  function escapeHtml(s) {
    if (!s) return '';
    return s.replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  /* ---------------------------
     Minimal theme toggle (persisted)
     --------------------------- */
  const THEME_KEY = 'a3d_theme';
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === 'light') document.documentElement.classList.add('light');
  themeToggle && themeToggle.addEventListener('click', () => {
    document.documentElement.classList.toggle('light');
    const nowLight = document.documentElement.classList.contains('light');
    localStorage.setItem(THEME_KEY, nowLight ? 'light' : 'dark');
    themeToggle.textContent = nowLight ? '☀️' : '🌙';
  });
})();
