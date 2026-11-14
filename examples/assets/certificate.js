const status = document.querySelector('#verification');
try {
  const identifier = location.pathname.split('/').pop();
  const response = await fetch(`/api/v1/demo-certificates/${encodeURIComponent(identifier)}`, { credentials: 'omit', cache: 'no-store' });
  if (!response.ok) throw new Error('Unavailable');
  const record = await response.json();
  const labels = { 'demo-valid': 'Valid fictional demo record.', 'demo-revoked': 'Revoked fictional demo record.', unknown: 'No matching demo record was found.' };
  status.textContent = labels[record.status] || 'The record could not be verified.';
  if (record.course_name && record.issue_date) {
    for (const [label, value] of [['Course', record.course_name], ['Issued', record.issue_date]]) {
      const term = document.createElement('dt'); term.textContent = label;
      const description = document.createElement('dd'); description.textContent = value;
      document.querySelector('#record').append(term, description);
    }
  }
} catch { status.textContent = 'Verification is unavailable. Please reload to try again.'; }
