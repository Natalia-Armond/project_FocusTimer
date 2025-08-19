// FocusTimer — Pomodoro simples com LocalStorage e Web Notifications
(function(){
  const timeEl = document.getElementById('time');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resetBtn = document.getElementById('resetBtn');
  const chips = document.querySelectorAll('.chip');
  const customForm = document.getElementById('customForm');
  const customMinutes = document.getElementById('customMinutes');
  const customSeconds = document.getElementById('customSeconds');
  const sessionsCountEl = document.getElementById('sessionsCount');
  const resetSessionsBtn = document.getElementById('resetSessionsBtn');
  if(resetSessionsBtn){
    resetSessionsBtn.addEventListener('click', function(){
      localStorage.setItem(SESSIONS_KEY, '0');
      sessionsCountEl.textContent = '0';
    });
  }
  const soundToggle = document.getElementById('soundToggle');
  const notifyToggle = document.getElementById('notifyToggle');
  const audioFileInput = document.getElementById('audioFileInput');
  let userAudioUrl = null;
  let notificationAudio = null;
  // Salva o arquivo de áudio selecionado pelo usuário
  if(audioFileInput){
    audioFileInput.addEventListener('change', function(e){
      const file = e.target.files[0];
      if(file){
        userAudioUrl = URL.createObjectURL(file);
        if(notificationAudio){
      // Elemento que exibe o tempo restante
      const timeEl = document.getElementById('time');
      // Botão para iniciar o timer
      const startBtn = document.getElementById('startBtn');
      // Botão para pausar o timer
      const pauseBtn = document.getElementById('pauseBtn');
      // Botão para zerar o timer
      const resetBtn = document.getElementById('resetBtn');
      // Botões para modos rápidos (Foco/Pausa)
      const chips = document.querySelectorAll('.chip');
      // Formulário para tempo personalizado
      const customForm = document.getElementById('customForm');
      // Input de minutos personalizados
      const customMinutes = document.getElementById('customMinutes');
      // Input de segundos personalizados
      const customSeconds = document.getElementById('customSeconds');
      // Elemento que exibe o número de sessões concluídas
      const sessionsCountEl = document.getElementById('sessionsCount');
      // Botão para zerar sessões
      const resetSessionsBtn = document.getElementById('resetSessionsBtn');
          notificationAudio.pause();
          notificationAudio = null;
        }
        notificationAudio = new Audio(userAudioUrl);
        notificationAudio.loop = false;
      }
    });
  }

  let totalSeconds = 25*60;
  let remaining = totalSeconds;
  let timerId = null;
  let running = false;

  // Persistência
  const KEY = 'focusTimerState-v1';
  const SESSIONS_KEY = 'focusTimerSessions-' + new Date().toISOString().slice(0,10);
  const PREFS_KEY = 'focusTimerPrefs';

    // Função que carrega o estado salvo do timer, sessões e preferências do usuário
  function load(){
    try {
      const state = JSON.parse(localStorage.getItem(KEY) || 'null');
      if(state){
        totalSeconds = state.totalSeconds;
        remaining = state.remaining;
        running = false;
      }
      const sessions = parseInt(localStorage.getItem(SESSIONS_KEY) || '0', 10);
      sessionsCountEl.textContent = sessions;
      const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
      if(prefs.soundEnabled !== undefined) soundToggle.checked = !!prefs.soundEnabled;
      if(prefs.notifyEnabled !== undefined) notifyToggle.checked = !!prefs.notifyEnabled;
    } catch(e){ /* ignore */ }
    render();
  }

    // Função que salva o estado atual do timer e preferências no localStorage
  function save(){
    localStorage.setItem(KEY, JSON.stringify({ totalSeconds, remaining }));
    localStorage.setItem(PREFS_KEY, JSON.stringify({ soundEnabled: soundToggle.checked, notifyEnabled: notifyToggle.checked }));
  }

    // Função que formata segundos para o formato MM:SS
  function format(sec){
    const m = String(Math.floor(sec/60)).padStart(2,'0');
    const s = String(sec%60).padStart(2,'0');
    return `${m}:${s}`;
  }

    // Função que atualiza o tempo exibido na tela
  function render(){ timeEl.textContent = format(remaining); }

    // Função chamada a cada segundo para atualizar o timer
  function tick(){
    if(remaining > 0){
      remaining -= 1;
      render();
      save();
    } else {
      stop();
      onFinished();
    }
  }

    // Função que inicia o timer
  function start(){
    if(running) return;
    running = true;
    timerId = setInterval(tick, 1000);
  }

    // Função que pausa o timer e o áudio de notificação
  function pause(){
  running = false;
  if(timerId){ clearInterval(timerId); timerId = null; }
  if(notificationAudio){ notificationAudio.pause(); notificationAudio.currentTime = 0; }
  save();
  }

    // Função que para o timer sem alterar o tempo
  function stop(){
    running = false;
    if(timerId){ clearInterval(timerId); timerId = null; }
  }

    // Função que zera o timer e o áudio de notificação
  function reset(){
  stop();
  if(notificationAudio){ notificationAudio.pause(); notificationAudio.currentTime = 0; }
  remaining = totalSeconds;
  render();
  save();
  }

    // Função que define o tempo da sessão (minutos e segundos)
  function setMinutes(min, sec=0){
    totalSeconds = min*60 + sec;
    remaining = totalSeconds;
    render();
    save();
  }

    // Função chamada quando o tempo acaba
  function onFinished(){
    // contabiliza sessão concluída
    const sessions = parseInt(localStorage.getItem(SESSIONS_KEY) || '0', 10) + 1;
    localStorage.setItem(SESSIONS_KEY, String(sessions));
    sessionsCountEl.textContent = sessions;

    // Toca o áudio escolhido pelo usuário até que o usuário pause ou zere
    if(soundToggle.checked){
      if(notificationAudio){
        notificationAudio.currentTime = 0;
        notificationAudio.loop = false;
        notificationAudio.play();
      } else if(userAudioUrl){
        notificationAudio = new Audio(userAudioUrl);
        notificationAudio.loop = false;
        notificationAudio.currentTime = 0;
        notificationAudio.play();
      } else {
        // fallback: som simples (WebAudio)
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine'; o.frequency.value = 880;
          o.connect(g); g.connect(ctx.destination);
          g.gain.setValueAtTime(0.0001, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.01);
          o.start();
          setTimeout(()=>{ g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3); o.stop(ctx.currentTime + 0.35); }, 350);
        } catch(e){ /* ignore */ }
      }
    }

    // notificação
    if(notifyToggle.checked && 'Notification' in window){
      if(Notification.permission === 'granted'){
        new Notification('⏱️ FocusTimer', { body: 'Tempo encerrado!' });
      } else if(Notification.permission !== 'denied'){
        Notification.requestPermission().then(p=>{
          if(p==='granted'){ new Notification('⏱️ FocusTimer', { body: 'Tempo encerrado!' }); }
        });
      }
    }
  }

  // Eventos
  startBtn.addEventListener('click', start);
  pauseBtn.addEventListener('click', pause);
  resetBtn.addEventListener('click', reset);

  chips.forEach(chip => chip.addEventListener('click', () => {
    chips.forEach(c=>c.classList.remove('active'));
    chip.classList.add('active');
    const min = parseInt(chip.dataset.minutes, 10);
    setMinutes(min, 0);
    pause();
  }));

  customForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    chips.forEach(c=>c.classList.remove('active'));
    const m = Math.min(Math.max(parseInt(customMinutes.value||'0',10),1),180);
    const s = Math.min(Math.max(parseInt(customSeconds.value||'0',10),0),59);
    setMinutes(m, s);
    pause();
  });

  window.addEventListener('beforeunload', save);
  load();
})();