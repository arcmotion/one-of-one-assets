const data = JSON.parse(document.getElementById('logo-data').textContent);
const tool = document.querySelector('[data-logo-tool]');
const stage = tool.querySelector('.stage');
const img = stage.querySelector('img');
const hint = tool.querySelector('.hint');
const colourHint = tool.querySelector('.colour-hint');
const rows = [...tool.querySelectorAll('[data-format]')];

function render() {
  const lockup = tool.querySelector('input[name=lockup]:checked').value;
  const colour = tool.querySelector('input[name=colour]:checked').value;
  const item = data.lockups[lockup];
  stage.dataset.on = colour;
  stage.style.setProperty('--w', item.stageWidth + '%');
  img.src = item.previews[colour];
  img.alt = `One of One ${lockup} logo, ${colour}`;
  hint.textContent = item.hint;
  colourHint.textContent = colour === 'black' ? 'For white and light backgrounds.' : 'For black and dark backgrounds.';
  rows.forEach(row => {
    const file = item.files[colour][row.dataset.format];
    row.querySelector('small').textContent = `${file.name}, ${file.size}`;
    const link = row.querySelector('a');
    link.href = file.link;
  });
}
tool.addEventListener('change', render);
render();

if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('video[data-loop]').forEach(video => video.play().catch(() => {}));
} else {
  document.querySelectorAll('video[data-loop]').forEach(video => { video.loop = false; });
}
