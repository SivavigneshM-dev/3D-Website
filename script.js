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
  const header = document.querySelector('.site-header');

  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  // Header scroll effect
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

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

    if (!prefersReducedMotion) requestAnimationFrame(updateParallax);
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
      if (Math.random() > 0.7) spawnTrailParticle(t.clientX, t.clientY);
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
      const gr