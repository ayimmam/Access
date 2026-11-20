const get = id => document.getElementById(id);
const number = new Intl.NumberFormat();
const clock = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' });
const preciseClock = new Intl.DateTimeFormat(undefined, { timeStyle: 'medium' });
const refreshButton = get('refresh');
const toggle = get('toggle');
const filter = get('filter');
let metrics;
let pending = false;

async function read(path) {
  const response = await fetch(path, { cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error('Request failed');
  return response.json();
}

function row(values) {
  const tr = document.createElement('tr');
  for (const value of values) {
    const cell = tr.insertCell();
    if (value instanceof Node) cell.append(value);
    else cell.textContent = value;
  }
  return tr;
}

function showRecent() {
  if (!metrics) return;
  const rows = metrics.recent.filter(item => filter.value === 'all' || item.status >= 400).map(item => {
    const route = document.createElement('code');
    route.textContent = item.route;
    return row([preciseClock.format(item.timestamp * 1000), route, item.status, item.duration_ms + ' ms']);
  });
  if (!rows.length) {
    const empty = row([filter.value === 'errors' ? 'No errors in the recent requests.' : 'No public requests recorded yet.']);
    empty.cells[0].colSpan = 4;
    rows.push(empty);
  }
  get('recent').replaceChildren(...rows);
}

function showTraffic(traffic) {
  const bins = traffic.map(({ start, responses: [ok, redirected, client, server] }) =>
    ({ time: clock.format(start * 1000), counts: [ok + redirected, client, server] }));
  const sum = values => values.reduce((total, value) => total + value, 0);
  const peak = Math.max(1, ...bins.map(bin => sum(bin.counts)));
  const bars = bins.map(({ time, counts }) => {
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = sum(counts) / peak * 100 + '%';
    bar.title = time + ' · ' + number.format(sum(counts)) + ' requests';
    ['normal', 'client', 'server'].forEach((className, index) => {
      const segment = document.createElement('span');
      segment.className = className;
      segment.style.flexGrow = counts[index];
      bar.append(segment);
    });
    return bar;
  });
  get('chart').replaceChildren(...bars);
  get('start').textContent = bins[0].time;
  get('end').textContent = bins.at(-1).time;
  get('traffic').replaceChildren(...bins.map(bin => row([bin.time, ...bin.counts.map(count => number.format(count))])));
}

async function refresh() {
  if (pending) return;
  pending = true;
  refreshButton.setAttribute('aria-busy', 'true');
  try {
    const [health, snapshot] = await Promise.allSettled([read('/healthz'), read('/api/dashboard/metrics')]);
    const healthy = health.status === 'fulfilled' && health.value.status === 'ok';
    get('health').className = healthy ? 'pill good' : 'pill bad';
    const healthLabel = healthy ? 'API operational' : 'Health check failed';
    if (get('health').textContent !== healthLabel) get('health').textContent = healthLabel;
    const notice = get('notice');
    notice.hidden = snapshot.status === 'fulfilled';
    if (notice.hidden) {
      metrics = snapshot.value;
      get('total').textContent = number.format(metrics.total);
      get('client').textContent = number.format(metrics.client_errors);
      get('server').textContent = number.format(metrics.server_errors);
      get('latency').textContent = metrics.mean_response_ms === null ? '—' : number.format(metrics.mean_response_ms) + ' ms';
      const minutes = Math.floor(metrics.uptime_seconds / 60);
      get('uptime').textContent = minutes ? `Uptime ${Math.floor(minutes / 60)}h ${minutes % 60}m` : 'Uptime under 1 min';
      get('updated').textContent = 'Updated ' + preciseClock.format(metrics.timestamp * 1000);
      showTraffic(metrics.traffic);
      showRecent();
    } else {
      notice.textContent = metrics ? 'Refresh failed. Displaying the last available metrics.' : 'Metrics are unavailable. Try refreshing.';
    }
  } finally {
    pending = false;
    refreshButton.removeAttribute('aria-busy');
  }
}

filter.addEventListener('change', showRecent);
refreshButton.addEventListener('click', refresh);
toggle.addEventListener('click', () => {
  const resume = toggle.getAttribute('aria-pressed') !== 'true';
  toggle.setAttribute('aria-pressed', String(resume));
  if (resume) void refresh();
});
setInterval(() => {
  if (!document.hidden && toggle.getAttribute('aria-pressed') === 'true') void refresh();
}, 10000);
void refresh();
