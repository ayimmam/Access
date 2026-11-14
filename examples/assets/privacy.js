const api = '/api/v1/security';
const status = document.querySelector('#status');
const error = document.querySelector('#error');
const consolePanel = document.querySelector('#console');
const loginPanel = document.querySelector('#sign-in');
const reauth = document.querySelector('#reauth');
const deletion = document.querySelector('#delete-confirm');
let session;
let clockOffset = 0;
let pendingAction;
let returnFocus;
let warningShown = false;
let requestPending = false;
let previousAccount;

function showError(message) {
  error.textContent = message; error.hidden = false; error.focus();
}
function clearError() { error.hidden = true; error.textContent = ''; }
function signedOut(message, clear = false) {
  if (clear) {
    previousAccount = undefined;
    delete consolePanel.dataset.loaded;
    document.querySelector('#preferences-form').reset();
    document.querySelector('#devices').replaceChildren();
    document.querySelector('#stored-data').replaceChildren();
  }
  session = undefined;
  consolePanel.hidden = true; loginPanel.hidden = false;
  if (reauth.open) reauth.close();
  if (deletion.open) deletion.close();
  status.textContent = message;
  document.querySelector('#alias').focus();
}
function acceptSession(value) {
  session = value;
  previousAccount = value.account_reference;
  clockOffset = value.server_time * 1000 - Date.now();
  warningShown = false;
  document.querySelector('#expiry-warning').hidden = true;
  loginPanel.hidden = true; consolePanel.hidden = false;
  const deadline = new Date(value.expires_at * 1000).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
  document.querySelector('#session-time').textContent = `This session is currently valid until ${deadline}. You can extend it within the maximum study period.`;
}
async function request(path, method = 'GET', body) {
  const headers = { Accept:'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET' && session) headers['X-CSRF-Token'] = session.csrf_token;
  let response;
  try {
    response = await fetch(api + path, { method, headers, credentials:'same-origin', cache:'no-store', body:body === undefined ? undefined : JSON.stringify(body) });
  } catch { throw { code:'network_error', message:'The connection was interrupted. Your choices remain on this page. Try again when connected.' }; }
  let data;
  try { data = await response.json(); }
  catch { throw { code:'invalid_response', message:'The service returned an unreadable response. Your choices remain on this page. Please try again.' }; }
  if (!response.ok) {
    if (data.error?.code === 'sign_in_required') signedOut(data.error.message);
    throw data.error || { message:'The action could not finish. Please try again.' };
  }
  return data;
}
async function act(action, opener = document.activeElement) {
  if (requestPending) return;
  requestPending = true; clearError();
  try { await action(); }
  catch (failure) {
    if (failure.code === 'reauthentication_required') {
      pendingAction = action; returnFocus = opener;
      document.querySelector('#reauth-error').textContent = '';
      reauth.showModal(); document.querySelector('#reauth-password').focus();
    } else showError(failure.message || 'The action could not finish. Please try again.');
  } finally { requestPending = false; }
}
async function loadDevices() {
  const data = await request('/sessions');
  const list = document.querySelector('#devices'); list.replaceChildren();
  for (const device of data.sessions) {
    const item = document.createElement('li');
    const date = new Date(device.created * 1000).toLocaleString();
    item.textContent = `${device.current ? 'This browser' : 'Another browser'} — signed in ${date}`;
    const end = document.createElement('button'); end.type = 'button'; end.textContent = device.current ? 'End this session' : `End session started ${date}`;
    end.addEventListener('click', () => void act(async () => {
      await request('/sessions/revoke', 'POST', { id:device.id });
      if (device.current) signedOut('This session has ended.', true);
      else { await loadDevices(); status.textContent = 'The selected browser session has ended.'; document.querySelector('#revoke-all').focus(); }
    }, end));
    item.append(end); list.append(item);
  }
}
async function loadPrivacy() {
  const data = await request('/privacy');
  const list = document.querySelector('#stored-data'); list.replaceChildren();
  for (const description of data.stored_data) { const item = document.createElement('li'); item.textContent = description; list.append(item); }
  document.querySelector('#remember').checked = data.preferences.remember === true;
  document.querySelector('#language').value = data.preferences.language || 'en';
  document.querySelector('#caption-size').value = data.preferences.caption_size || 'standard';
  await loadDevices();
}
document.querySelector('#show-password').addEventListener('change', event => { document.querySelector('#password').type = event.target.checked ? 'text' : 'password'; });
document.querySelector('#show-reauth').addEventListener('change', event => { document.querySelector('#reauth-password').type = event.target.checked ? 'text' : 'password'; });
document.querySelector('#login-form').addEventListener('submit', event => {
  event.preventDefault();
  const resume = Boolean(pendingAction);
  void act(async () => {
    const data = await request('/login', 'POST', { alias:document.querySelector('#alias').value, password:document.querySelector('#password').value });
    const restore = previousAccount === data.account_reference;
    document.querySelector('#password').value = '';
    acceptSession(data);
    // Preserve unsaved preference controls across expiry and sign-in.
    if (!restore || !consolePanel.dataset.loaded) { await loadPrivacy(); consolePanel.dataset.loaded = 'true'; }
    else await loadDevices();
    status.textContent = 'Signed in. Your privacy controls are available.';
    document.querySelector('#refresh-session').focus();
    if (resume) status.textContent = 'Signed in again. Review your choices and repeat the action when ready.';
    pendingAction = undefined;
  });
});
document.querySelector('#preferences-form').addEventListener('submit', event => {
  event.preventDefault();
  void act(async () => {
    await request('/privacy', 'PUT', { remember:document.querySelector('#remember').checked, language:document.querySelector('#language').value, caption_size:document.querySelector('#caption-size').value });
    status.textContent = 'Your privacy choice was saved.';
  });
});
document.querySelector('#refresh-session').addEventListener('click', () => void act(async () => { acceptSession(await request('/session')); await loadDevices(); status.textContent = 'Session checked.'; }));
document.querySelector('#extend').addEventListener('click', () => void act(async () => {
  acceptSession(await request('/extend', 'POST'));
  status.textContent = 'Your session has been extended within its maximum duration.';
  document.querySelector('#refresh-session').focus();
}));
document.querySelector('#logout').addEventListener('click', () => void act(async () => { await request('/logout', 'POST'); signedOut('Signed out. This browser session has ended.', true); }));
document.querySelector('#confirm-again').addEventListener('click', () => {
  pendingAction = undefined; returnFocus = document.activeElement;
  document.querySelector('#reauth-error').textContent = ''; reauth.showModal(); document.querySelector('#reauth-password').focus();
});
reauth.addEventListener('close', () => { document.querySelector('#reauth-password').value = ''; returnFocus?.focus(); });
document.querySelector('#cancel-reauth').addEventListener('click', () => { pendingAction = undefined; reauth.close(); });
document.querySelector('#reauth-form').addEventListener('submit', async event => {
  event.preventDefault(); if (requestPending) return;
  requestPending = true;
  try {
    acceptSession(await request('/reauthenticate', 'POST', { password:document.querySelector('#reauth-password').value }));
    reauth.close(); const continuation = pendingAction; pendingAction = undefined;
    if (continuation) await continuation();
    else status.textContent = 'Passphrase confirmed. Your session was renewed.';
  } catch (failure) {
    document.querySelector('#reauth-error').textContent = failure.message;
    document.querySelector('#reauth-password').focus();
  } finally { requestPending = false; }
});
document.querySelector('#export').addEventListener('click', () => void act(async () => {
  const data = await request('/privacy/export');
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type:'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'access-demo-data.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000); status.textContent = 'Your demo data download was requested.';
}));
document.querySelector('#revoke-all').addEventListener('click', () => void act(async () => { await request('/sessions/revoke', 'POST', {}); signedOut('All your browser sessions have ended.', true); }));
document.querySelector('#delete').addEventListener('click', () => { deletion.showModal(); document.querySelector('#cancel-delete').focus(); });
deletion.addEventListener('close', () => { if (session) document.querySelector('#delete').focus(); });
document.querySelector('#cancel-delete').addEventListener('click', () => deletion.close());
document.querySelector('#confirm-delete').addEventListener('click', () => {
  deletion.close();
  void act(async () => { await request('/privacy', 'DELETE'); signedOut('Your demo account, saved preferences and sessions have been deleted.', true); });
});
setInterval(() => {
  if (!session) return;
  const remaining = session.expires_at * 1000 - Date.now() - clockOffset;
  if (remaining <= 0) {
    pendingAction = undefined;
    signedOut('Your session ended. Sign in again to continue. Your choices remain on this page.');
  } else if (remaining <= 120000 && !warningShown) {
    warningShown = true; document.querySelector('#expiry-warning').hidden = false;
    const absoluteRemaining = session.absolute_expires_at * 1000 - Date.now() - clockOffset;
    document.querySelector('#warning-text').textContent = absoluteRemaining <= 120000
      ? 'Your maximum study period will end within two minutes. Sign in again after it ends to start a new session. Your choices remain on this page.'
      : 'Your session will end within two minutes. You can keep working by extending it or confirming your passphrase.';
  }
}, 1000);
void act(async () => {
  try { acceptSession(await request('/session')); await loadPrivacy(); consolePanel.dataset.loaded = 'true'; status.textContent = 'Your privacy controls are available.'; }
  catch (failure) {
    if (failure.code === 'sign_in_required') status.textContent = 'Sign in with the fictional account supplied by your facilitator.';
    else throw failure;
  }
});
