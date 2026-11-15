const productionOrigin = document.documentElement.dataset.pluginOrigin;
const local = ['localhost', '127.0.0.1'].includes(location.hostname);
const pluginOrigin = local ? 'http://127.0.0.1:8000' : productionOrigin;
const pathValue = location.pathname.split('/').filter(Boolean).pop() || 'unknown';
const identifier = decodeURIComponent(['certificate', 'certificate.html'].includes(pathValue)
  ? new URLSearchParams(location.search).get('id') || 'unknown'
  : pathValue);
const status = document.querySelector('#verification');
const record = document.querySelector('#record');
document.querySelector('#record-reference').textContent = identifier;

const retry = document.querySelector('#retry-verification');
async function verify() {
  retry.disabled = true; record.replaceChildren(); status.textContent = 'Checking the demo record…';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${pluginOrigin}/api/v1/demo-certificates/${encodeURIComponent(identifier)}`, { credentials: 'omit', cache: 'no-store', signal: controller.signal, redirect: 'error' });
    if (!response.ok) throw new Error('Unavailable');
    const result = await response.json();
    const labels = {
      'demo-valid': 'Valid fictional demo record.',
      'demo-revoked': 'Revoked fictional demo record.',
      unknown: 'No matching demo record was found.'
    };
    status.textContent = labels[result.status] || 'The demo record could not be verified.';
    status.dataset.state = result.status;
    retry.hidden = true;
    if (result.course_name && result.issue_date) {
      for (const [label, value] of [['Course', result.course_name], ['Issued', new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${result.issue_date}T12:00:00Z`))]]) {
        const group = document.createElement('div');
        const term = document.createElement('dt'); term.textContent = label;
        const description = document.createElement('dd'); description.textContent = value;
        group.append(term, description); record.append(group);
      }
    }
  } catch {
    status.textContent = 'Verification is temporarily unavailable. Retry verification when your connection is ready.';
    status.dataset.state = 'unknown';
    retry.hidden = false;
  } finally { clearTimeout(timer); retry.disabled = false; }
}
retry.addEventListener('click', () => void verify());
void verify();
document.querySelector('#copy-verification').addEventListener('click', async () => {
  const url = new URL(`/certificates/${encodeURIComponent(identifier)}`, location.origin).href;
  const shareStatus = document.querySelector('#share-status');
  try { await navigator.clipboard.writeText(url); shareStatus.textContent = 'Fictional verification link copied. No learner information is included.'; }
  catch {
    const input = document.querySelector('#verification-link'); input.value = url;
    document.querySelector('#verification-link-label').hidden = false; input.focus(); input.select();
    shareStatus.textContent = 'Clipboard unavailable. Copy the selected verification link manually.';
  }
});
