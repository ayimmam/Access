const menu = document.querySelector('.menu-button');
menu.addEventListener('click', () => {
  const collapsed = document.body.classList.toggle('navigation-collapsed');
  menu.setAttribute('aria-expanded', String(!collapsed));
});

const completion = document.querySelector('#mark-complete');
completion.addEventListener('click', () => {
  completion.disabled = true;
  completion.textContent = 'Demo lesson completed';
  document.querySelector('#completion-status').textContent = 'Completed in this demo session.';
  document.querySelector('#progress-text').textContent = '1 of 1 lessons completed in this demo';
  document.querySelector('.progress-fill').style.width = '100%';
});
