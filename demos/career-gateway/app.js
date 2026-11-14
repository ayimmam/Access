const productionOrigin = document.documentElement.dataset.pluginOrigin;
const local = ['localhost', '127.0.0.1'].includes(location.hostname);
const pluginOrigin = local ? 'http://127.0.0.1:8000' : productionOrigin;
const apiBase = `${pluginOrigin}/api/v1`;
const certificateBase = local ? 'http://127.0.0.1:5174/certificates/' : `${location.origin}/certificates/`;
const status = document.querySelector('#release-status');
const gateway = document.querySelector('access-career-gateway');

if (gateway) {
  gateway.setAttribute('api-base', apiBase);
  gateway.setAttribute('certificate-base', certificateBase);
}

try {
  const response = await fetch(`${pluginOrigin}/components/0.1.0/integrity.json`, { credentials: 'omit' });
  if (!response.ok) throw new Error('Release unavailable');
  const manifest = await response.json();
  const integrity = manifest['jobs.js'];
  if (typeof integrity !== 'string' || !/^sha384-[A-Za-z0-9+/]{64}$/.test(integrity)) throw new Error('Invalid release integrity');
  const script = document.createElement('script');
  script.type = 'module'; script.src = `${pluginOrigin}/components/0.1.0/jobs.js`;
  script.integrity = integrity; script.crossOrigin = 'anonymous';
  await new Promise((resolve, reject) => { script.onload = resolve; script.onerror = reject; document.head.append(script); });
  status.textContent = 'Career tools connected. All vacancies on this page are fictional public fixtures.';
} catch {
  status.textContent = 'Career tools could not connect. Open the public fixture link or try again shortly.';
}
