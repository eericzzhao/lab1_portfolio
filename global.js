console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

let pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'contact/', title: 'Contact' },
  { url: 'https://github.com/eericzzhao', title: 'Github' }
];

const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1") ? "/" : "/website/";

let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
    let url = !p.url.startsWith('http') ? BASE_PATH + p.url : p.url;
    let a = document.createElement('a');
    a.href = url;
    a.textContent = p.title;
    a.classList.toggle('current', a.host === location.host && a.pathname === location.pathname);
    if (a.host !== location.host) a.target = "_blank";
    nav.append(a);
}


document.body.insertAdjacentHTML(
  'afterbegin',
  `
	<label class="color-scheme">
		Theme:
		<select>
			<option value="light dark">Automatic</option>
			<option value="light">Light</option>
			<option value="dark">Dark</option>
		</select>
	</label>`
);

const select = document.querySelector('.color-scheme select');

function setColorScheme(colorScheme) {
  document.documentElement.style.setProperty('color-scheme', colorScheme);
  select.value = colorScheme;
}

select.addEventListener('input', function (event) {
  const scheme = event.target.value;
  setColorScheme(scheme);
  
  localStorage.colorScheme = scheme;
});

if ("colorScheme" in localStorage) {
  setColorScheme(localStorage.colorScheme);
}