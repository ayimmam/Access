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

try {
  const response = await fetch(`${pluginOrigin}/api/v1/demo-certificates/${encodeURIComponent(identifier)}`, { credentials: 'omit', cache: 'no-store' });
  if (!response.ok) throw new Error('Unavailable');
  const result = await response.json();
  const labels = {
    'demo-valid': 'Valid fictional demo record.',
    'demo-revoked': 'Revoked fictional demo record.',
    unknown: 'No matching demo record was found.'
  };
  status.textContent = labels[result.status] || 'The demo record could not be verified.';
  status.dataset.state = result.status;
  if (result.course_name && result.issue_date) {
    for (const [label, value] of [['Course', result.course_name], ['Issued', new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${result.issue_date}T12:00:00Z`))]]) {
      const group = document.createElement('div');
      const term = document.createElement('dt'); term.textContent = label;
      const description = document.createElement('dd'); description.textContent = value;
      group.append(term, description); record.append(group);
    }
  }
} catch {
  status.textContent = 'Verification is temporarily unavailable. Reload to try again.';
  status.dataset.state = 'unknown';
}
