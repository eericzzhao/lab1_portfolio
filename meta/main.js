import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

let data = []; 
let commits = []; 
let xScale, yScale;
let commitProgress = 100;
let timeScale;
let commitMaxTime;

async function loadData() {
    const rawData = await d3.csv('loc.csv', (row) => ({
        ...row,
        line: Number(row.line),
        depth: Number(row.depth),
        length: Number(row.length),
        date: new Date(row.date + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime),
    }));
    return rawData;
}

function processCommits(data) {
    let rawCommits = d3.groups(data, (d) => d.commit)
             .map(([commit, lines]) => {
                 let first = lines[0];
                 let { author, date, time, timezone, datetime } = first;
                 
                 let ret = {
                     id: commit,
                     url: 'https://github.com/eericzzhao/lab1_portfolio/commit/' + commit,
                     author,
                     date,
                     time,
                     timezone,
                     datetime,
                     hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
                     totalLines: lines.length,
                 };

                 Object.defineProperty(ret, 'lines', {
                     value: lines,
                     configurable: true,
                     writable: true,
                     enumerable: false, 
                 });

                 return ret;
             });

    return d3.sort(rawCommits, (d) => d.datetime);
}

function renderTooltipContent(commit) {
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
    const time = document.getElementById('commit-time-tooltip'); 
    const author = document.getElementById('commit-author');
    const lines = document.getElementById('commit-lines');

    if (Object.keys(commit).length === 0) return;

    link.href = commit.url;
    link.textContent = commit.id.slice(0, 7); 
    date.textContent = commit.datetime?.toLocaleString('en', { dateStyle: 'full' });
    time.textContent = commit.datetime?.toLocaleTimeString('en', { timeStyle: 'short' });
    author.textContent = commit.author;
    lines.textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    if (tooltip) tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    if (tooltip) {
        tooltip.style.left = `${event.clientX + 15}px`;
        tooltip.style.top = `${event.clientY + 15}px`;
    }
}

// --- Stats Rendering ---
function renderCommitInfo(data, commits) {
    d3.select('#stats').html('');
    
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');
    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(data.length);
    dl.append('dt').text('Total commits');
    dl.append('dd').text(commits.length);

    const numFiles = d3.group(data, d => d.file).size;
    dl.append('dt').text('Number of files');
    dl.append('dd').text(numFiles);

    const maxDepth = d3.max(data, d => d.depth);
    dl.append('dt').text('Maximum depth');
    dl.append('dd').text(maxDepth);

    const maxLineLength = d3.max(data, d => d.length);
    dl.append('dt').text('Longest line');
    dl.append('dd').text(maxLineLength);

    const workByPeriod = d3.rollups(
        data,
        (v) => v.length, 
        (d) => new Date(d.datetime).toLocaleString('en', { dayPeriod: 'short' }) 
    );

    const maxPeriod = d3.greatest(workByPeriod, (d) => d[1])?.[0];
    dl.append('dt').text('Most Active Time');
    dl.append('dd').text(maxPeriod);
}

function renderScatterPlot(data, commits) {
    const width = 1000;
    const height = 600;
    const margin = { top: 10, right: 10, bottom: 30, left: 20 };

    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    const svg = d3.select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    xScale = d3.scaleTime()
        .domain(d3.extent(commits, (d) => d.datetime))
        .range([usableArea.left, usableArea.right])
        .nice();

    yScale = d3.scaleLinear()
        .domain([0, 24])
        .range([usableArea.bottom, usableArea.top]);

    const gridlines = svg.append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);

    gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));
    gridlines.selectAll('line').style('stroke', (d) => {
        return d >= 6 && d <= 18 ? 'oklch(70% 0.1 50)' : 'oklch(50% 0.1 250)';
    });

    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale)
        .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00'); 

    svg.append('g')
       .attr('transform', `translate(0, ${usableArea.bottom})`)
       .attr('class', 'x-axis') 
       .call(xAxis);

    svg.append('g')
       .attr('transform', `translate(${usableArea.left}, 0)`)
       .attr('class', 'y-axis') 
       .call(yAxis);

    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
    
    const rScale = d3.scaleSqrt()
        .domain([minLines, maxLines])
        .range([2, 30]); 

    const dots = svg.append('g').attr('class', 'dots');
    
    dots.selectAll('circle')
        .data(sortedCommits, (d) => d.id) 
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', (d) => rScale(d.totalLines)) 
        .style('--r', (d) => rScale(d.totalLines)) 
        .attr('fill', 'steelblue')
        .style('fill-opacity', 0.7) 
        .on('mouseenter', (event, commit) => {
            d3.select(event.currentTarget).style('fill-opacity', 1); 
            renderTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mouseleave', (event) => {
            d3.select(event.currentTarget).style('fill-opacity', 0.7); 
            updateTooltipVisibility(false);
        });
        
    svg.call(d3.brush().on('start brush end', brushed));
    svg.selectAll('.dots, .overlay ~ *').raise();
}

function updateScatterPlot(commits) {
    const svg = d3.select('#chart').select('svg');
    const xExtent = d3.extent(commits, (d) => d.datetime);
    
    if (xExtent[0]) {
        xScale.domain(xExtent);
    }

    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
    const rScale = d3.scaleSqrt().domain([minLines || 0, maxLines || 0]).range([2, 30]);

    const xAxis = d3.axisBottom(xScale);
    const xAxisGroup = svg.select('g.x-axis');
    xAxisGroup.selectAll('*').remove();
    xAxisGroup.call(xAxis);

    const dots = svg.select('g.dots');
    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

    dots.selectAll('circle')
        .data(sortedCommits, (d) => d.id) 
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', (d) => rScale(d.totalLines))
        .style('--r', (d) => rScale(d.totalLines)) 
        .attr('fill', 'steelblue')
        .style('fill-opacity', 0.7)
        .on('mouseenter', (event, commit) => {
            d3.select(event.currentTarget).style('fill-opacity', 1);
            renderTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mouseleave', (event) => {
            d3.select(event.currentTarget).style('fill-opacity', 0.7);
            updateTooltipVisibility(false);
        });

    svg.selectAll('.dots, .overlay ~ *').raise();
}

// --- Brushing Functions ---
function brushed(event) {
    const selection = event.selection;
    d3.selectAll('circle').classed('selected', (d) => isCommitSelected(selection, d));
    renderSelectionCount(selection);
    renderLanguageBreakdown(selection);
}

function isCommitSelected(selection, commit) {
    if (!selection) return false;
    const [x0, x1] = selection.map((d) => d[0]);
    const [y0, y1] = selection.map((d) => d[1]);
    const x = xScale(commit.datetime);
    const y = yScale(commit.hourFrac);
    return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

function renderSelectionCount(selection) {
    const selectedCommits = selection
        ? commits.filter((d) => isCommitSelected(selection, d))
        : [];
    const countElement = document.getElementById('selection-count');
    if (countElement) {
        countElement.textContent = `${selectedCommits.length || 'No'} commits selected`;
    }
    return selectedCommits;
}

function renderLanguageBreakdown(selection) {
    const selectedCommits = selection
        ? commits.filter((d) => isCommitSelected(selection, d))
        : [];
    const container = document.getElementById('language-breakdown');

    if (!container) return;
    if (selectedCommits.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    const requiredCommits = selectedCommits.length ? selectedCommits : commits;
    const lines = requiredCommits.flatMap((d) => d.lines);
    const breakdown = d3.rollup(lines, (v) => v.length, (d) => d.type);

    container.innerHTML = '';
    for (const [language, count] of breakdown) {
        const proportion = count / lines.length;
        const formatted = d3.format('.1~%')(proportion);
        container.innerHTML += `
            <dt>${language}</dt>
            <dd>${count} lines (${formatted})</dd>
        `;
    }
}

// --- File Unit Visualization ---
function updateFileDisplay(filteredCommits) {
    let lines = filteredCommits.flatMap((d) => d.lines);
    
    let files = d3.groups(lines, (d) => d.file)
                  .map(([name, lines]) => {
                      return { name, lines };
                  });

    files = d3.sort(files, (d) => -d.lines.length);

    let filesContainer = d3.select('#files')
        .selectAll('div')
        .data(files, (d) => d.name)
        .join(
            (enter) => enter.append('div').call((div) => {
                div.append('dt').append('code');
                div.append('dd');
            })
        );

    filesContainer.select('dt > code').text((d) => d.name);
    
    let fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);

    filesContainer.select('dd')
        .selectAll('div')
        .data(d => d.lines)
        .join('div')
        .attr('class', 'line')
        .style('background', d => fileTypeColors(d.type));
}

// --- Slider Event ---
function onTimeSliderChange(event) {
    commitProgress = event ? event.target.value : commitProgress;
    commitMaxTime = timeScale.invert(commitProgress);
    
    const timeElement = document.getElementById('commit-time');
    if (timeElement) {
        timeElement.textContent = commitMaxTime.toLocaleString('en', {
            dateStyle: "long",
            timeStyle: "short"
        });
    }

    let filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);
    let filteredData = data.filter((d) => d.datetime <= commitMaxTime);

    updateScatterPlot(filteredCommits);
    renderCommitInfo(filteredData, filteredCommits);
    updateFileDisplay(filteredCommits);
}

// --- STEP 3: Scrollytelling Setup ---
function renderStory() {
    d3.select('#scatter-story')
        .selectAll('.step')
        .data(commits)
        .join('div')
        .attr('class', 'step')
        .html((d, i) => {
            const lines = d.lines || [];
            const numFiles = d3.rollups(lines, (D) => D.length, (d) => d.file).length;

            return `
                <p>On ${d.datetime.toLocaleString('en', { dateStyle: 'full', timeStyle: 'short' })}, 
                I made <a href="${d.url}" target="_blank">${i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'}</a>. 
                I edited ${d.totalLines} lines across ${numFiles} files. 
                Then I looked over all I had made, and I saw that it was very good.</p>
            `;
        });
}

function onStepEnter(response) {
    const scrollMaxTime = response.element.__data__.datetime;
    
    let filteredCommits = commits.filter((d) => d.datetime <= scrollMaxTime);
    let filteredData = data.filter((d) => d.datetime <= scrollMaxTime);

    updateScatterPlot(filteredCommits);
    renderCommitInfo(filteredData, filteredCommits);
    updateFileDisplay(filteredCommits);
    
    const slider = document.getElementById('commit-progress');
    if (slider) {
        slider.value = timeScale(scrollMaxTime);
        // Dispatch an event manually to ensure UI updates without infinite loop
        slider.dispatchEvent(new Event('input'));
    }
}

async function main() {
    try {
        data = await loadData(); 
        commits = processCommits(data); 
        window.commits = commits; 

        timeScale = d3.scaleTime()
            .domain([d3.min(commits, d => d.datetime), d3.max(commits, d => d.datetime)])
            .range([0, 100]);

        renderCommitInfo(data, commits);
        renderScatterPlot(data, commits);
        updateFileDisplay(commits);

        // 2. THEN set up the slider
        const timeSlider = document.getElementById('commit-progress');
        if (timeSlider) {
            timeSlider.addEventListener('input', onTimeSliderChange);
        }

        // 3. Initialize Scrollama Scrollytelling
        renderStory();
        const scroller = scrollama();
        scroller.setup({
            container: '#scrolly-1',
            step: '#scrolly-1 .step',
            offset: 0.5, 
        }).onStepEnter(onStepEnter);
        
    } catch (error) {
        console.error("Error loading or rendering data:", error);
    }
}

main(); // Start everything!