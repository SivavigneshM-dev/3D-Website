(() => {
  // Helpers & feature detection
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ==================== 
  // CURSOR ELEMENTS - FINAL
  // ====================
  const cursor = document.getElementById('cursor');
  const cursorDot = document.getElementById('cursor-dot');
  const cursorHalo = document.getElementById('cursor-halo');
  const trailCanvas = document.getElementById('trail-canvas');
  const yearSpan = document.getElementById('year');
  const themeToggle = document.getElementById('theme-toggle');
  const header = document.querySelector('.site-header');
  const projects = Array.from(document.querySelectorAll('.project'));
  const lightbox = document.getElementById('lightbox');
  const lightboxContent = document.getElementById('lightbox-content');
  const lightboxClose = document.getElementById('lightbox-close');

  // Set current year
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  // ==================== 
  // CURSOR SYSTEM - FINAL
  // ====================
  let cursorX = 0;
  let cursorY = 0;
  let targetX = 0;
  let targetY = 0;
  let cursorVisible = false;

  function initCursor() {
    console.log('Initializing cursor system...');
    
    // Don't initialize cursor for touch devices or reduced motion
    if (isTouch || prefersReducedMotion) {
      if (cursor) cursor.style.display = 'none';
      return;
    }

    // Show cursor after initialization
    setTimeout(() => {
      if (cursor) {
        cursor.classList.add('active');
        cursor.style.opacity = '1';
      }
    }, 100);

    // Mouse move event
    document.addEventListener('mousemove', (e) => {
      cursorVisible = true;
      targetX = e.clientX;
      targetY = e.clientY;
      
      if (cursor) {
        cursor.style.opacity = '1';
      }
      
      // Spawn particles
      if (!prefersReducedMotion) {
        spawnTrailParticle(e.clientX, e.clientY);
      }
    });

    // Mouse leave window
    document.addEventListener('mouseleave', () => {
      cursorVisible = false;
      if (cursor) {
        cursor.style.opacity = '0';
      }
    });

    // Mouse enter window
    document.addEventListener('mouseenter', () => {
      cursorVisible = true;
      if (cursor) {
        cursor.style.opacity = '1';
      }
    });

    // Click effects
    document.addEventListener('mousedown', () => {
      if (cursorDot) {
        cursorDot.style.transform = 'translate(-50%, -50%) scale(0.7)';
      }
    });

    document.addEventListener('mouseup', () => {
      if (cursorDot) {
        cursorDot.style.transform = 'translate(-50%, -50%) scale(1)';
      }
    });

    // Smooth cursor animation
    function animateCursor() {
      // Smooth interpolation
      cursorX += (targetX - cursorX) * 0.15;
      cursorY += (targetY - cursorY) * 0.15;

      // Update cursor position
      if (cursor && cursorVisible) {
        cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0) translate(-50%, -50%)`;
      }

      requestAnimationFrame(animateCursor);
    }

    animateCursor();

    // Initialize magnetic effects
    initMagneticEffects();
  }

  function initMagneticEffects() {
    const magneticElements = document.querySelectorAll('.project, .btn, .preview-btn, .card');
    
    magneticElements.forEach(element => {
      // Mouse enter
      element.addEventListener('mouseenter', () => {
        if (!cursorVisible || isTouch) return;
        
        // Enlarge cursor
        if (cursorHalo) cursorHalo.style.transform = 'scale(1.8)';
        if (cursorDot) cursorDot.style.transform = 'translate(-50%, -50%) scale(0.45)';
        
        element.classList.add('is-magnetic');
      });

      // Mouse leave
      element.addEventListener('mouseleave', () => {
        // Reset cursor
        if (cursorHalo) cursorHalo.style.transform = 'scale(1)';
        if (cursorDot) cursorDot.style.transform = 'translate(-50%, -50%) scale(1)';
        
        // Reset element transform
        element.style.transform = '';
        element.classList.remove('is-magnetic');
      });

      // Mouse move over element
      element.addEventListener('mousemove', (e) => {
        if (!cursorVisible || isTouch) return;

        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const mouseX = e.clientX - centerX;
        const mouseY = e.clientY - centerY;
        
        // Calculate magnetic pull
        const distance = Math.sqrt(mouseX * mouseX + mouseY * mouseY);
        const maxDistance = Math.min(rect.width, rect.height) / 2;
        
        if (distance < maxDistance) {
          const strength = 0.2;
          const pullX = mouseX * strength;
          const pullY = mouseY * strength;
          
          // Apply magnetic effect to cursor halo
          if (cursorHalo) {
            cursorHalo.style.transform = `translate(${pullX}px, ${pullY}px) scale(1.9)`;
          }
          
          // Slightly move the element
          const elementTiltX = (mouseY / maxDistance) * 5;
          const elementTiltY = (mouseX / maxDistance) * -5;
          const elementLift = 10;
          
          element.style.transform = `
            perspective(1000px) 
            translate3d(${pullX * 0.5}px, ${pullY * 0.5}px, ${elementLift}px)
            rotateX(${elementTiltX}deg) 
            rotateY(${elementTiltY}deg)
          `;
        }
      });
    });
  }

  // ==================== 
  // PARTICLE SYSTEM - FINAL
  // ====================
  const particles = [];

  function spawnTrailParticle(x, y) {
    if (!trailCtx || prefersReducedMotion || isTouch) return;
    
    // Throttle particle creation
    if (Math.random() > 0.6) return;
    
    particles.push({
      x: x,
      y: y,
      life: 1,
      size: 4 + Math.random() * 6,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      hue: 120 + Math.random() * 40 // Green hue range
    });
    
    // Limit particles array size
    if (particles.length > 150) {
      particles.splice(0, particles.length - 120);
    }
  }

  function updateTrail() {
    if (!trailCtx || isTouch) return;
    
    // Clear with fade effect for trailing
    trailCtx.fillStyle = 'rgba(7, 16, 38, 0.1)';
    trailCtx.fillRect(0, 0, innerWidth, innerHeight);
    
    // Update and draw particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= 0.02;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.98; // Friction
      p.vy *= 0.98;
      
      const alpha = Math.max(0, p.life);
      const size = p.size * p.life;
      
      // Draw particle with glow effect
      const gradient = trailCtx.createRadialGradient(
        p.x, p.y, 0,
        p.x, p.y, size
      );
      gradient.addColorStop(0, `hsla(${p.hue}, 100%, 60%, ${alpha})`);
      gradient.addColorStop(1, `hsla(${p.hue}, 100%, 60%, 0)`);
      
      trailCtx.beginPath();
      trailCtx.fillStyle = gradient;
      trailCtx.arc(p.x, p.y, size, 0, Math.PI * 2);
      trailCtx.fill();
      
      // Remove dead particles
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }
    
    if (!prefersReducedMotion) {
      requestAnimationFrame(updateTrail);
    }
  }

  // ==================== 
  // CANVAS SETUP - FINAL
  // ====================
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

  // ==================== 
  // THEME TOGGLE - FINAL
  // ====================
  themeToggle.addEventListener('click', () => {
    document.documentElement.classList.toggle('light');
    themeToggle.textContent = document.documentElement.classList.contains('light') ? '☀️' : '🌙';
  });

  // ==================== 
  // HEADER SCROLL EFFECT - FINAL
  // ====================
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  // ==================== 
  // LIGHTBOX SYSTEM - FINAL
  // ====================
  const previewBtns = document.querySelectorAll('.preview-btn');
  previewBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const project = e.target.closest('.project');
      const title = project.dataset.title || project.querySelector('h3').textContent;
      const desc = project.dataset.desc || project.querySelector('p').textContent;
      const image = project.dataset.image || project.querySelector('.card-media').style.backgroundImage.slice(5, -2);
      
      lightboxContent.innerHTML = `
        <img src="${image}" alt="${title}" style="width:100%; border-radius:8px; margin-bottom:16px;">
        <h4>${title}</h4>
        <p>${desc}</p>
      `;
      document.getElementById('lightbox-title').textContent = title;
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    });
  });

  lightboxClose.addEventListener('click', () => {
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  });

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  });

  // Close lightbox with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.getAttribute('aria-hidden') === 'false') {
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  });

  // ==================== 
  // INITIALIZE EVERYTHING - FINAL
  // ====================
  document.addEventListener('DOMContentLoaded', () => {
    console.log('Device type:', isTouch ? 'Mobile/Touch' : 'Desktop');
    
    // Initialize cursor system
    initCursor();
    
    // Initialize particle system
    if (!prefersReducedMotion && !isTouch) {
      updateTrail();
    }
  });

  // ==================== 
  // SECTION FADE-IN ANIMATION - FINAL
  // ====================
  const sections = document.querySelectorAll('section');
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, observerOptions);

  sections.forEach(section => {
    section.classList.add('fade-in');
    observer.observe(section);
  });

  // ==================== 
  // GEIGER COUNTER SOUND EFFECT - FINAL
  // ====================
  function playGeigerSound() {
    if (prefersReducedMotion) return;
    
    // Create audio context for geiger counter sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
  }

  // Play geiger sound on button clicks
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!prefersReducedMotion) playGeigerSound();
    });
  });

  // Play geiger sound on project hover
  projects.forEach(project => {
    project.addEventListener('mouseenter', () => {
      if (!isTouch && !prefersReducedMotion && Math.random() > 0.7) {
        playGeigerSound();
      }
    });
  });
})();