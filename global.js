console.log('IT’S ALIVE!');

function $(selector, context = document) {
  return context.querySelector(selector);
}

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

let pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'contact/', title: 'Contact' },
  { url: 'https://github.com/eericzzhao', title: 'Github' }
];

const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1") ? "/" : "/portfolio/";

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


export async function fetchJSON(url) {
  try {
    // Fetch the JSON file from the given URL
    const response = await fetch(url);
    
    // Check if the request was successful
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
    
  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
  }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {

    if (!containerElement) {
        console.error('Invalid container element provided.');
        return;
    }


    const validHeadings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    if (!validHeadings.includes(headingLevel)) {
        console.warn(`Invalid heading level: ${headingLevel}. Defaulting to h2.`);
        headingLevel = 'h2';
    }

    containerElement.innerHTML = '';

for (let project of projects) {
        const article = document.createElement('article');

        const title = project.title || 'Untitled Project';
        const image = project.image || 'https://vis-society.github.io/labs/2/images/empty.svg';
        const description = project.description || 'No description available.';
        
        const year = project.year ? `<time datetime="${project.year}">${project.year}</time>` : '';


        article.innerHTML = `
            <${headingLevel}>${title}</${headingLevel}>
            <img src="${image}" alt="${title}">
            <div class="project-info">
                ${year}
                <p>${description}</p>
            </div>
        `;

        containerElement.appendChild(article);
    }
}

export async function fetchGitHubData(username) {
    return fetchJSON(`https://api.github.com/users/${username}`);
}