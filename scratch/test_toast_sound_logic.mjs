/**
 * Test Toast Notification Sound Trigger Logic & Preference Matrix
 */
import assert from 'assert';

console.log('===============================================================');
console.log(' STARTING TOAST NOTIFICATION SOUND TRIGGER VERIFICATION SUITE');
console.log('===============================================================\n');

function createToastSystem(initialPrefs = { soundAlerts: true, orderNotifications: true }) {
  let stationPreferences = { ...initialPrefs };
  const toasts = [];
  let soundPlayedCount = 0;

  const mockPlaySuccessSound = () => {
    soundPlayedCount++;
  };

  const addToast = (message, type = 'info', duration = 5000, options = {}) => {
    const isErrorOrWarning = type === 'error' || type === 'warning';

    // 1. Check whether a toast should be displayed:
    // If Interactive Toast Notifications is disabled, suppress optional success and info toasts.
    // Critical errors and warnings must ALWAYS remain accessible!
    if (!stationPreferences.orderNotifications && !isErrorOrWarning) {
      return; // Toast suppressed -> no popup displayed, and NO sound played!
    }

    // 2. Display the toast
    const id = Date.now() + Math.random().toString();
    toasts.push({ id, message, type });

    // 3. Play its sound exactly once ONLY if:
    // - Toast was actually displayed (guaranteed by passing check above)
    // - Both settings are enabled (Interactive Toast Notifications: ON and Audio Sound Cues: ON)
    // - Operational event (type === 'success')
    // - Not an exempted silent notification (e.g. login, registration, background refresh)
    const isSilent = options?.silent || options?.playSound === false;
    if (
      !isSilent &&
      stationPreferences.orderNotifications &&
      stationPreferences.soundAlerts &&
      type === 'success'
    ) {
      mockPlaySuccessSound();
    }
  };

  return {
    stationPreferences,
    setPreferences: (newPrefs) => {
      stationPreferences = { ...stationPreferences, ...newPrefs };
    },
    addToast,
    getToasts: () => [...toasts],
    clearToasts: () => { toasts.length = 0; },
    getSoundCount: () => soundPlayedCount,
    resetSoundCount: () => { soundPlayedCount = 0; }
  };
}

let passedTests = 0;

// Test 1: Matrix Case 1 (ON / ON) -> Toast displayed, sound played once
{
  const system = createToastSystem({ soundAlerts: true, orderNotifications: true });
  system.addToast('Order sent to kitchen', 'success');
  assert.strictEqual(system.getToasts().length, 1, 'Toast should be displayed');
  assert.strictEqual(system.getSoundCount(), 1, 'Sound should play exactly once');
  console.log('✔ Test 1 Passed: ON / ON -> Toast displayed, sound played once');
  passedTests++;
}

// Test 2: Matrix Case 2 (ON / OFF) -> Toast displayed, sound NOT played
{
  const system = createToastSystem({ soundAlerts: false, orderNotifications: true });
  system.addToast('Bill settled successfully', 'success');
  assert.strictEqual(system.getToasts().length, 1, 'Toast should be displayed');
  assert.strictEqual(system.getSoundCount(), 0, 'Sound should NOT play (soundAlerts is OFF)');
  console.log('✔ Test 2 Passed: ON / OFF -> Toast displayed without sound');
  passedTests++;
}

// Test 3: Matrix Case 3 (OFF / ON) -> Toast suppressed, sound NOT played
{
  const system = createToastSystem({ soundAlerts: true, orderNotifications: false });
  system.addToast('Staff member created', 'success');
  assert.strictEqual(system.getToasts().length, 0, 'Toast should be suppressed');
  assert.strictEqual(system.getSoundCount(), 0, 'Sound should NOT play (toasts are OFF)');
  console.log('✔ Test 3 Passed: OFF / ON -> Toast suppressed, NO sound played');
  passedTests++;
}

// Test 4: Matrix Case 4 (OFF / OFF) -> Toast suppressed, sound NOT played
{
  const system = createToastSystem({ soundAlerts: false, orderNotifications: false });
  system.addToast('Dish marked ready', 'success');
  assert.strictEqual(system.getToasts().length, 0, 'Toast should be suppressed');
  assert.strictEqual(system.getSoundCount(), 0, 'Sound should NOT play');
  console.log('✔ Test 4 Passed: OFF / OFF -> Toast suppressed, NO sound played');
  passedTests++;
}

// Test 5: Login Notification -> Silent even with ON / ON
{
  const system = createToastSystem({ soundAlerts: true, orderNotifications: true });
  // Simulating AuthContext login call
  system.addToast('Welcome back, Admin!', 'success', 5000, { silent: true });
  assert.strictEqual(system.getToasts().length, 1, 'Login toast appears');
  assert.strictEqual(system.getSoundCount(), 0, 'Login toast MUST NOT play sound');
  console.log('✔ Test 5 Passed: Login notification is silent (no sound on login)');
  passedTests++;
}

// Test 6: Critical errors and warnings remain visible when notifications are OFF
{
  const system = createToastSystem({ soundAlerts: true, orderNotifications: false });
  system.addToast('Insufficient inventory stock', 'error');
  system.addToast('Table number is required', 'warning');
  assert.strictEqual(system.getToasts().length, 2, 'Error and warning toasts MUST NOT be suppressed');
  assert.strictEqual(system.getSoundCount(), 0, 'Errors and warnings do not play success sound');
  console.log('✔ Test 6 Passed: Critical errors and warnings remain visible when notifications are OFF');
  passedTests++;
}

// Test 7: Data refresh toasts are silent
{
  const system = createToastSystem({ soundAlerts: true, orderNotifications: true });
  system.addToast('Dashboard analytics refreshed', 'success', 5000, { silent: true });
  system.addToast('Analytical reports refreshed', 'success', 5000, { silent: true });
  assert.strictEqual(system.getToasts().length, 2, 'Refresh toasts appear');
  assert.strictEqual(system.getSoundCount(), 0, 'Data refresh MUST NOT play sound');
  console.log('✔ Test 7 Passed: Data refresh notifications are silent');
  passedTests++;
}

console.log(`\n===============================================================`);
console.log(` ALL ${passedTests} TOAST SOUND TRIGGER TESTS PASSED 100%`);
console.log(`===============================================================\n`);
