import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

const projects = await fetchJSON('../projects.json');
const projectsContainer = document.querySelector('.projects');

if (projectsContainer) {
    renderProjects(projects, projectsContainer, 'h2');
}

const projectsTitle = document.querySelector('.projects-title');
if (projectsTitle && projects) {
    projectsTitle.textContent = `${projects.length} Projects`;
}

let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
let colors = d3.scaleOrdinal(d3.schemeTableau10);

// EXTRA CREDIT: UNIFIED STATE MANAGEMENT
let query = '';
let selectedYear = '';

function filterProjects() {
    let filteredByQuery = projects.filter((project) => {
        let values = Object.values(project).join('\n').toLowerCase();
        return values.includes(query.toLowerCase());
    });

    let filteredProjects = filteredByQuery;
    if (selectedYear) {
        filteredProjects = filteredProjects.filter((project) => project.year === selectedYear);
    }

    renderProjects(filteredProjects, projectsContainer, 'h2');
    renderPieChart(filteredByQuery);
}

function renderPieChart(projectsGiven) {
    let newSVG = d3.select('#projects-pie-plot');
    newSVG.selectAll('path').remove();
    
    let legend = d3.select('.legend');
    legend.selectAll('li').remove();

    let newRolledData = d3.rollups(
        projectsGiven,
        (v) => v.length,
        (d) => d.year
    );

    let newData = newRolledData.map(([year, count]) => {
        return { value: count, label: year };
    });

    let newSliceGenerator = d3.pie().value((d) => d.value);
    let newArcData = newSliceGenerator(newData);
    let newArcs = newArcData.map((d) => arcGenerator(d));

    newArcs.forEach((arc, i) => {
        newSVG.append('path')
              .attr('d', arc)
              .attr('fill', colors(i))
              .attr('class', newData[i].label === selectedYear ? 'selected' : '')
              .on('click', () => {
                  selectedYear = selectedYear === newData[i].label ? '' : newData[i].label;
                  filterProjects();
              });
    });

    newData.forEach((d, i) => {
        legend.append('li')
              .attr('style', `--color:${colors(i)}`) 
              .attr('class', d.label === selectedYear ? 'legend-item selected' : 'legend-item')            
              .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`); 
    });
}

renderPieChart(projects);

let searchInput = document.querySelector('.searchBar');
searchInput.addEventListener('input', (event) => {
    query = event.target.value;
    filterProjects();
});