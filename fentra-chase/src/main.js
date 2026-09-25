const params = new URLSearchParams(location.search);
const mod = await import(params.has('sheet') ? './sheet.js' : './film.js');
await mod.boot(document.getElementById('c'));
window.filmReady = true;
