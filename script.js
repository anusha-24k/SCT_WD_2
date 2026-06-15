/* ============================================================
   Flow Zone — script.js
   Timer Engine + Interval Logging + Stats + Auto-Categorization
   ============================================================ */
 
 
/* ──────────────────────────────────────
   STATE VARIABLES
   These store the current state of the
   stopwatch at any given moment.
────────────────────────────────────── */
 
let timerInterval  = null;   // Holds the setInterval reference
let startTime      = 0;      // When the timer was last started (Date.now())
let elapsedTime    = 0;      // Total elapsed ms (accumulates across pause/resume)
let isRunning      = false;  // Is the timer currently ticking?
 
let lastIntervalTime = 0;    // Elapsed ms at the last logged interval
let intervals        = [];   // Array of interval objects
 
 
/* ──────────────────────────────────────
   DOM REFERENCES
   Grab all the elements we'll update
────────────────────────────────────── */
 
const timerHMS      = document.getElementById('timerHMS');
const timerMS       = document.getElementById('timerMS');
const timerDisplay  = document.getElementById('timerDisplay');
 
const statusDot     = document.getElementById('statusDot');
const statusText    = document.getElementById('statusText');
 
const btnStart      = document.getElementById('btnStart');
const btnPause      = document.getElementById('btnPause');
const btnInterval   = document.getElementById('btnInterval');
const btnReset      = document.getElementById('btnReset');
 
const statTotal     = document.getElementById('statTotal');
const statBest      = document.getElementById('statBest');
const statElapsed   = document.getElementById('statElapsed');
 
const intervalStream = document.getElementById('intervalStream');
const emptyState     = document.getElementById('emptyState');
const streamCount    = document.getElementById('streamCount');
 
 
/* ──────────────────────────────────────
   1. START TIMER
────────────────────────────────────── */
 
function startTimer() {
  if (isRunning) return; // Already running, do nothing
 
  isRunning = true;
 
  // Record when we started (so we can calculate elapsed accurately)
  startTime = Date.now() - elapsedTime;
 
  // setInterval calls updateDisplay every 10ms (for smooth milliseconds)
  timerInterval = setInterval(updateDisplay, 10);
 
  // Update UI state
  setStatus('running');
  timerDisplay.classList.add('running');
 
  // Button states
  btnStart.disabled    = true;
  btnPause.disabled    = false;
  btnInterval.disabled = false;
  btnReset.disabled    = false;
}
 
 
/* ──────────────────────────────────────
   2. PAUSE TIMER
────────────────────────────────────── */
 
function pauseTimer() {
  if (!isRunning) return; // Not running, do nothing
 
  isRunning = false;
 
  // Save how much time has elapsed so far
  elapsedTime = Date.now() - startTime;
 
  // Stop the interval
  clearInterval(timerInterval);
  timerInterval = null;
 
  // Update UI state
  setStatus('paused');
  timerDisplay.classList.remove('running');
 
  // Button states
  btnStart.disabled    = false;
  btnPause.disabled    = true;
  btnInterval.disabled = true;
}
 
 
/* ──────────────────────────────────────
   3. RESET TIMER
────────────────────────────────────── */
 
function resetTimer() {
  // Stop everything
  isRunning = false;
  clearInterval(timerInterval);
  timerInterval = null;
 
  // Reset all state variables
  startTime        = 0;
  elapsedTime      = 0;
  lastIntervalTime = 0;
  intervals        = [];
 
  // Reset display
  timerHMS.textContent = '00:00:00';
  timerMS.textContent  = '.00';
  timerDisplay.classList.remove('running');
 
  // Reset stats
  statTotal.textContent   = '0';
  statBest.textContent    = '—';
  statElapsed.textContent = '00:00:00.00';
 
  // Reset interval stream — show empty state again
  intervalStream.innerHTML = '';
  intervalStream.appendChild(createEmptyState());
  streamCount.textContent = '0 logged';
 
  // Reset status
  setStatus('idle');
 
  // Button states
  btnStart.disabled    = false;
  btnPause.disabled    = true;
  btnInterval.disabled = true;
}
 
 
/* ──────────────────────────────────────
   4. LOG INTERVAL
   Records the current split time
────────────────────────────────────── */
 
function logInterval() {
  if (!isRunning) return;
 
  // How long this specific interval took
  const currentElapsed  = Date.now() - startTime;
  const intervalTime    = currentElapsed - lastIntervalTime;
 
  // Save this as the new "last interval point"
  lastIntervalTime = currentElapsed;
 
  // Determine category based on average
  const category = getCategory(intervalTime);
 
  // Build the interval data object
  const intervalData = {
    intervalNumber: intervals.length + 1,
    intervalTime:   intervalTime,
    totalElapsed:   currentElapsed,
    category:       category
  };
 
  // Add to our array
  intervals.push(intervalData);
 
  // Create and show the card
  addIntervalCard(intervalData);
 
  // Update stats
  updateStats();
}
 
 
/* ──────────────────────────────────────
   5. UPDATE DISPLAY
   Called every 10ms by setInterval
────────────────────────────────────── */
 
function updateDisplay() {
  // Current elapsed time in milliseconds
  elapsedTime = Date.now() - startTime;
 
  // Format and show the time
  const formatted = formatTime(elapsedTime);
  timerHMS.textContent = formatted.hms;
  timerMS.textContent  = '.' + formatted.ms;
 
  // Also update the elapsed stat
  statElapsed.textContent = formatted.hms + '.' + formatted.ms;
}
 
 
/* ──────────────────────────────────────
   6. FORMAT TIME
   Converts milliseconds → HH:MM:SS + ms
────────────────────────────────────── */
 
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours        = Math.floor(totalSeconds / 3600);
  const minutes      = Math.floor((totalSeconds % 3600) / 60);
  const seconds      = totalSeconds % 60;
  const millis       = Math.floor((ms % 1000) / 10); // 2-digit ms
 
  return {
    hms: pad(hours) + ':' + pad(minutes) + ':' + pad(seconds),
    ms:  pad(millis)
  };
}
 
// Pads a number to 2 digits: 5 → "05"
function pad(num) {
  return String(num).padStart(2, '0');
}
 
// Format ms into a readable string like "00:12.45"
function formatIntervalTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes      = Math.floor(totalSeconds / 60);
  const seconds      = totalSeconds % 60;
  const millis       = Math.floor((ms % 1000) / 10);
  return pad(minutes) + ':' + pad(seconds) + '.' + pad(millis);
}
 
 
/* ──────────────────────────────────────
   7. GET CATEGORY
   Compares this interval to the average
   of all previous intervals.
────────────────────────────────────── */
 
function getCategory(intervalTime) {
  // If this is the very first interval, it's always Steady
  if (intervals.length === 0) return 'steady';
 
  // Calculate average of all previous intervals
  const total   = intervals.reduce(function(sum, i) { return sum + i.intervalTime; }, 0);
  const average = total / intervals.length;
 
  // 15% faster than average → Peak Flow
  // 15% slower than average → Stalled
  // Otherwise → Steady
  if (intervalTime < average * 0.85) {
    return 'peak';
  } else if (intervalTime > average * 1.15) {
    return 'stalled';
  } else {
    return 'steady';
  }
}
 
 
/* ──────────────────────────────────────
   8. ADD INTERVAL CARD TO DOM
────────────────────────────────────── */
 
function addIntervalCard(data) {
  // Hide empty state if it exists
  const empty = document.getElementById('emptyState');
  if (empty) empty.remove();
 
  // Build category display info
  const categoryMap = {
    peak:    { label: '🟢 Peak Flow', className: 'peak' },
    steady:  { label: '🟡 Steady',    className: 'steady' },
    stalled: { label: '🔴 Stalled',   className: 'stalled' }
  };
 
  const cat = categoryMap[data.category];
 
  // Create the card element
  const card = document.createElement('div');
  card.className = 'interval-card ' + cat.className;
 
  card.innerHTML =
    '<span class="card-num">#' + pad(data.intervalNumber) + '</span>' +
    '<div class="card-info">' +
      '<span class="card-interval-time">' + formatIntervalTime(data.intervalTime) + '</span>' +
      '<span class="card-total-time">Total: ' + formatIntervalTime(data.totalElapsed) + '</span>' +
    '</div>' +
    '<span class="card-badge ' + cat.className + '">' + cat.label + '</span>';
 
  // Add newest card at the TOP of the stream
  intervalStream.insertBefore(card, intervalStream.firstChild);
 
  // Update count badge
  streamCount.textContent = intervals.length + ' logged';
}
 
 
/* ──────────────────────────────────────
   9. UPDATE STATS PANEL
────────────────────────────────────── */
 
function updateStats() {
  // Total intervals
  statTotal.textContent = intervals.length;
 
  // Best interval = the shortest intervalTime
  const best = intervals.reduce(function(min, i) {
    return i.intervalTime < min ? i.intervalTime : min;
  }, Infinity);
 
  statBest.textContent = formatIntervalTime(best);
}
 
 
/* ──────────────────────────────────────
   10. SET STATUS INDICATOR
   Updates the dot color + label text
────────────────────────────────────── */
 
function setStatus(state) {
  // Remove all state classes
  statusDot.classList.remove('idle', 'running', 'paused');
  statusText.classList.remove('running', 'paused');
 
  // Apply new state
  statusDot.classList.add(state);
 
  if (state === 'running') {
    statusText.textContent = 'RUNNING';
    statusText.classList.add('running');
  } else if (state === 'paused') {
    statusText.textContent = 'PAUSED';
    statusText.classList.add('paused');
  } else {
    statusText.textContent = 'IDLE';
  }
}
 
 
/* ──────────────────────────────────────
   11. CREATE EMPTY STATE ELEMENT
   Used by resetTimer() to restore
   the empty state after a reset.
────────────────────────────────────── */
 
function createEmptyState() {
  const div = document.createElement('div');
  div.className = 'empty-state';
  div.id        = 'emptyState';
  div.innerHTML =
    '<div class="empty-icon">⏱</div>' +
    '<p class="empty-title">No intervals recorded yet.</p>' +
    '<p class="empty-sub">Start the timer and log your first interval.</p>';
  return div;
}
 
 
/* ──────────────────────────────────────
   KEYBOARD SHORTCUTS (Bonus)
   Makes it feel like a real app!
   Space → Start/Pause
   L     → Log Interval
   R     → Reset
────────────────────────────────────── */
 
document.addEventListener('keydown', function(e) {
  // Don't trigger if user is typing in an input
  if (e.target.tagName === 'INPUT') return;
 
  if (e.code === 'Space') {
    e.preventDefault();
    if (isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  }
 
  if (e.code === 'KeyL' && isRunning) {
    logInterval();
  }
 
  if (e.code === 'KeyR') {
    resetTimer();
  }
});