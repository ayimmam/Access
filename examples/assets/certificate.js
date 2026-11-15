const status = document.querySelector('#verification');
const retry = document.querySelector('#retry-verification');
async function verify() {
  retry.disabled = true; document.querySelector('#record').replaceChildren(); status.textContent = 'Checking the demo record…';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const identifier = location.pathname.split('/').pop();
    const response = await fetch(`/api/v1/demo-certificates/${encodeURIComponent(identifier)}`, { credentials: 'omit', cache: 'no-store', signal: controller.signal, redirect: 'error' });
    if (!response.ok) throw new Error('Unavailable');
    const record = await response.json();
    const labels = { 'demo-valid': 'Valid fictional demo record.', 'demo-revoked': 'Revoked fictional demo record.', unknown: 'No matching demo record was found.' };
    status.textContent = labels[record.status] || 'The record could not be verified.';
    retry.hidden = true;
    if (record.course_name && record.issue_date) {
      for (const [label, value] of [['Course', record.course_name], ['Issued', record.issue_date]]) {
        const term = document.createElement('dt'); term.textContent = label;
        const description = document.createElement('dd'); description.textContent = value;
        document.querySelector('#record').append(term, description);
      }
    }
  } catch { status.textContent = 'Verification is unavailable. Retry verification when your connection is ready.'; retry.hidden = false; }
  finally { clearTimeout(timer); retry.disabled = false; }
}
retry.addEventListener('click', () => void verify());
void verify();
document.querySelector('#copy-verification').addEventListener('click', async () => {
  const url = new URL(location.pathname, location.origin).href;
  const shareStatus = document.querySelector('#share-status');
  try { await navigator.clipboard.writeText(url); shareStatus.textContent = 'Fictional verification link copied. No learner information is included.'; }
  catch {
    const input = document.querySelector('#verification-link'); input.value = url;
    document.querySelector('#verification-link-label').hidden = false; input.focus(); input.select();
    shareStatus.textContent = 'Clipboard unavailable. Copy the selected verification link manually.';
  }
});
