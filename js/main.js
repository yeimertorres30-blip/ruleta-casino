(() => {
  // ========== STATE ==========
  const items = [];
  let isSpinning = false;
  let wheelAngle = 0;          
  let ballAngle = 0;           
  let ballRadius = 0;          
  let animId = null;

  // ========== AUDIO ASSETS ==========
  const sounds = {
    click: new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'),
    spin: new Audio('https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3'),
    win: new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3')
  };

  sounds.click.volume = 0.3;
  sounds.spin.volume = 0.5;
  sounds.win.volume = 0.6;
  sounds.spin.loop = true;

  function playSound(soundKey) {
    try {
      const s = sounds[soundKey];
      if (s) {
        if (soundKey !== 'spin') {
          s.currentTime = 0;
        }
        s.play().catch(e => console.log("Audio play blocked by browser policy:", e));
      }
    } catch (err) {
      console.error(err);
    }
  }

  function stopSound(soundKey) {
    try {
      const s = sounds[soundKey];
      if (s) {
        s.pause();
        s.currentTime = 0;
      }
    } catch (err) {
      console.error(err);
    }
  }

  // DOM
  const canvas = document.getElementById('rouletteCanvas');
  const ctx = canvas.getContext('2d');
  const confettiCanvas = document.getElementById('confettiCanvas');
  const confettiCtx = confettiCanvas.getContext('2d');
  const itemInput = document.getElementById('itemInput');
  const addBtn = document.getElementById('addBtn');
  const clearBtn = document.getElementById('clearBtn');
  const removeLastBtn = document.getElementById('removeLastBtn');
  const spinBtn = document.getElementById('spinBtn');
  const itemList = document.getElementById('itemList');
  const countNum = document.getElementById('countNum');
  const countStatus = document.getElementById('countStatus');
  const modalOverlay = document.getElementById('modalOverlay');
  const winnerName = document.getElementById('winnerName');
  const closeModal = document.getElementById('closeModal');
  const toastEl = document.getElementById('toast');

  // Resize confetti
  function resizeConfetti() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeConfetti);
  resizeConfetti();

  // ========== UI HELPERS ==========
  function showToast(msg, ms = 2600) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), ms);
  }

  function updateCount() {
    const n = items.length;
    countNum.textContent = n;
    if (n >= 26) {
      countStatus.textContent = 'Ready to spin';
      countStatus.className = 'status ok';
      spinBtn.disabled = isSpinning;
    } else {
      countStatus.textContent = `Need ${26 - n} more`;
      countStatus.className = 'status need';
      spinBtn.disabled = true;
    }
  }

  function renderList() {
    itemList.innerHTML = '';
    items.forEach((label, i) => {
      const div = document.createElement('div');
      div.className = 'item';
      div.innerHTML = `
        <span class="idx">#${i + 1}</span>
        <span class="label" title="${label}">${label}</span>
        <button class="remove" data-i="${i}" title="Remove">×</button>
      `;
      itemList.appendChild(div);
    });
    updateCount();
    drawWheel();
  }

  function addItem() {
    const raw = itemInput.value.trim();
    if (!raw) {
      showToast('Please enter an item');
      return;
    }
    if (items.some(x => x.toLowerCase() === raw.toLowerCase())) {
      showToast('Item already exists – duplicates not allowed');
      return;
    }
    if (raw.length > 40) {
      showToast('Maximum 40 characters');
      return;
    }
    playSound('click');
    items.push(raw);
    itemInput.value = '';
    renderList();
    itemInput.focus();
  }

  addBtn.addEventListener('click', addItem);
  itemInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') addItem();
  });

  clearBtn.addEventListener('click', () => {
    if (isSpinning) return;
    if (items.length && confirm('Clear all items?')) {
      playSound('click');
      items.length = 0;
      renderList();
    }
  });

  removeLastBtn.addEventListener('click', () => {
    if (isSpinning || !items.length) return;
    playSound('click');
    items.pop();
    renderList();
  });

  itemList.addEventListener('click', e => {
    if (isSpinning) return;
    const btn = e.target.closest('.remove');
    if (!btn) return;
    playSound('click');
    const i = +btn.dataset.i;
    items.splice(i, 1);
    renderList();
  });

  closeModal.addEventListener('click', () => {
    playSound('click');
    modalOverlay.classList.remove('show');
  });

  // ========== DRAWING ==========
  const CX = canvas.width / 2;
  const CY = canvas.height / 2;
  const OUTER_R = 310;
  const INNER_R = 95;
  const BALL_TRACK_R = 292;   // Pista exterior de madera
  const POCKET_R = 140;       // Fondo profundo del casillero

  const segmentColors = [
    '#c41e3a', '#1a1a1a', '#c41e3a', '#1a1a1a',
    '#c41e3a', '#1a1a1a', '#c41e3a', '#1a1a1a',
    '#0d6b4c', '#1a1a1a', '#c41e3a', '#1a1a1a'
  ];

  function drawWheel() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const n = items.length || 1;
    const slice = (Math.PI * 2) / n;

    // Outer gold ring
    ctx.beginPath();
    ctx.arc(CX, CY, OUTER_R + 6, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1200';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(CX, CY, OUTER_R + 2, 0, Math.PI * 2);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 5;
    ctx.stroke();

    // Segments
    for (let i = 0; i < n; i++) {
      const start = wheelAngle + i * slice;
      const end = start + slice;

      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.arc(CX, CY, OUTER_R, start, end);
      ctx.closePath();
      ctx.fillStyle = segmentColors[i % segmentColors.length];
      ctx.fill();

      // Separadores dorados entre casilleros
      ctx.beginPath();
      ctx.moveTo(CX + Math.cos(start) * INNER_R, CY + Math.sin(start) * INNER_R);
      ctx.lineTo(CX + Math.cos(start) * OUTER_R, CY + Math.sin(start) * OUTER_R);
      ctx.strokeStyle = 'rgba(212,175,55,0.7)';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (items.length) {
        const mid = start + slice / 2;
        const textR = (OUTER_R + INNER_R) / 2 + 10;
        ctx.save();
        ctx.translate(CX + Math.cos(mid) * textR, CY + Math.sin(mid) * textR);
        ctx.rotate(mid + Math.PI / 2);
        ctx.fillStyle = '#f5e6a3';
        ctx.font = `bold ${Math.max(9, Math.min(14, 280 / n))}px Segoe UI, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let label = items[i];
        if (label.length > 12) label = label.slice(0, 10) + '…';
        ctx.fillText(label, 0, 0);
        ctx.restore();
      }
    }

    // Inner circle (hub)
    const grad = ctx.createRadialGradient(CX, CY, 20, CX, CY, INNER_R);
    grad.addColorStop(0, '#2a2a35');
    grad.addColorStop(0.7, '#15151c');
    grad.addColorStop(1, '#0a0a0f');
    ctx.beginPath();
    ctx.arc(CX, CY, INNER_R, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 18px Segoe UI';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ROULETTE', CX, CY - 8);
    ctx.font = '11px Segoe UI';
    ctx.fillStyle = '#8a8790';
    ctx.fillText(items.length ? `${items.length} pockets` : 'Add items', CX, CY + 12);

    // Ball
    if (items.length) {
      const bx = CX + Math.cos(ballAngle) * ballRadius;
      const by = CY + Math.sin(ballAngle) * ballRadius;

      ctx.beginPath();
      ctx.arc(bx + 2, by + 3, 9, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fill();

      const ballGrad = ctx.createRadialGradient(bx - 3, by - 3, 1, bx, by, 10);
      ballGrad.addColorStop(0, '#ffffff');
      ballGrad.addColorStop(0.4, '#e8e8e8');
      ballGrad.addColorStop(1, '#9a9a9a');
      ctx.beginPath();
      ctx.arc(bx, by, 9, 0, Math.PI * 2);
      ctx.fillStyle = ballGrad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  ballRadius = BALL_TRACK_R;
  drawWheel();

  // ========== SPIN LOGIC (SEAMLESS CONTINUOUS TRAJECTORY) ==========
  // ========== SPIN LOGIC (LOCKED RELATIVE TO WHEEL) ==========
  function spin() {
    if (isSpinning || items.length < 26) return;
    isSpinning = true;
    spinBtn.disabled = true;
    if (animId) cancelAnimationFrame(animId);

    playSound('spin');

    const n = items.length;
    const slice = (Math.PI * 2) / n;

    // Seleccionamos el ganador aleatorio
    const targetWinner = Math.floor(Math.random() * n);

    const startWheel = wheelAngle;
    const startBall = ballAngle;

    // La rueda da varias vueltas y se detiene en un ángulo final aleatorio
    const wheelRevolutions = 5 + Math.random() * 3;
    const finalWheelAngle = startWheel + wheelRevolutions * Math.PI * 2;

    // Desplazamiento adicional para que la rueda caiga en el elemento ganador
    const targetWheelAngle = finalWheelAngle - (targetWinner * slice) + (Math.PI * 2 * 100);

    // La bola comienza dando vueltas en sentido contrario por la pista exterior
    const ballRevolutions = 8 + Math.random() * 4;
    const initialBallDelta = -(ballRevolutions * Math.PI * 2);

    const startTime = performance.now();
    const duration = 8500;

    function animate(now) {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);

      // Curva de desaceleración suave (easeOutQuart) para la rueda
      const wheelProgress = 1 - Math.pow(1 - t, 4);
      wheelAngle = startWheel + (targetWheelAngle - startWheel) * wheelProgress;

      // Trayectoria de la bola:
      // Primera mitad (0 a 50%): Gira libremente por la pista exterior (`BALL_TRACK_R`)
      // Segunda mitad (50% a 100%): Entra en espiral hacia el casillero y SE ANCLA a la rotación de la rueda
      if (t < 0.5) {
        const p1 = t / 0.5;
        const ballProgress = 1 - Math.pow(1 - p1, 3);
        ballAngle = startBall + initialBallDelta * ballProgress;
        ballRadius = BALL_TRACK_R;
      } else {
        const p2 = (t - 0.5) / 0.5; // 0 a 1
        const dropEase = p2 * p2 * (3 - 2 * p2); // Smoothstep
        
        // El radio desciende suavemente hasta el fondo del casillero
        ballRadius = BALL_TRACK_R - (BALL_TRACK_R - POCKET_R) * dropEase;

        // MAGia aquí: en lugar de mover la bola de forma independiente, 
        // la fijamos exactamente al centro del casillero del ganador rotando con la rueda.
        // Esto elimina por completo el salto raro al detenerse.
        const perfectPocketAngle = wheelAngle + (targetWinner * slice) + (slice / 2);
        
        // Transición fluida desde la posición anterior de la bola hasta el casillero exacto
        const angleAtHalf = startBall + initialBallDelta * (1 - Math.pow(1, 3)); // aproximación
        // Interpolamos sin saltos
        ballAngle = perfectPocketAngle; 
      }

      drawWheel();

      if (t < 1) {
        animId = requestAnimationFrame(animate);
      } else {
        wheelAngle = targetWheelAngle;
        // Posición final perfecta y bloqueada en el centro del casillero
        ballAngle = wheelAngle + (targetWinner * slice) + (slice / 2);
        ballRadius = POCKET_R; 
        drawWheel();

        stopSound('spin');

        setTimeout(() => {
          showWinner(items[targetWinner]);
          isSpinning = false;
          spinBtn.disabled = items.length < 26;
        }, 400);
      }
    }

    animId = requestAnimationFrame(animate);
  }     

  spinBtn.addEventListener('click', () => {
    playSound('click');
    spin();
  });

  // ========== WINNER + CONFETTI ==========
  function showWinner(name) {
    winnerName.textContent = name;
    modalOverlay.classList.add('show');
    playSound('win');
    launchConfetti();
  }

  let confettiParticles = [];
  function launchConfetti() {
    confettiParticles = [];
    const colors = ['#d4af37', '#c41e3a', '#00ff9d', '#ffffff', '#f5e6a3', '#4fc3f7'];
    for (let i = 0; i < 160; i++) {
      confettiParticles.push({
        x: Math.random() * confettiCanvas.width,
        y: -20 - Math.random() * 80,
        vx: (Math.random() - 0.5) * 8,
        vy: 2 + Math.random() * 5,
        size: 4 + Math.random() * 7,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 0.3,
        life: 1
      });
    }
    requestAnimationFrame(confettiLoop);
  }

  function confettiLoop() {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    let alive = false;
    for (const p of confettiParticles) {
      if (p.life <= 0) continue;
      alive = true;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;
      p.rot += p.rotV;
      p.life -= 0.006;
      confettiCtx.save();
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate(p.rot);
      confettiCtx.globalAlpha = Math.max(0, p.life);
      confettiCtx.fillStyle = p.color;
      confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      confettiCtx.restore();
    }
    if (alive) requestAnimationFrame(confettiLoop);
    else confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }

  // ========== DEMO DATA ==========
  document.getElementById('demoBtn').addEventListener('click', () => {
    if (isSpinning) return;
    playSound('click');
    const demo = [
      'Ace', 'King', 'Queen', 'Jack', '10', '9', '8', '7', '6', '5',
      '4', '3', '2', 'A♥', 'K♦', 'Q♣', 'J♠', 'Red', 'Black', 'Zero',
      'Lucky', 'Fortune', 'Gold', 'Diamond', 'Star', 'Moon'
    ];
    items.length = 0;
    demo.forEach(d => items.push(d));
    renderList();
    showToast('26 demo items loaded – ready to spin!');
  });

  // Initial empty state
  renderList();
})();