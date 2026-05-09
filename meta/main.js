import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

async function loadData() {
    const data = await d3.csv('loc.csv', (row) => ({
        ...row,
        line: Number(row.line),
        depth: Number(row.depth),
        length: Number(row.length),
        date: new Date(row.date + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime),
    }));

    return data;
}

function processCommits(data) {
    return d3.groups(data, (d) => d.commit)
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
}

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
        (d) => new Date(d.datetime).toLocaleString('en', { dayPeriod: 'short' }) // Key: time of day
    );

    const maxPeriod = d3.greatest(workByPeriod, (d) => d[1])?.[0];
    dl.append('dt').text('Most Active Time');
    dl.append('dd').text(maxPeriod);
}
function renderTooltipContent(commit) {
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
    const time = document.getElementById('commit-time');
    const author = document.getElementById('commit-author');
    const lines = document.getElementById('commit-lines');

    if (Object.keys(commit).length === 0) return;

    link.href = commit.url;
    link.textContent = commit.id.slice(0, 7); // Usually we only show the first 7 chars of a commit hash
    date.textContent = commit.datetime?.toLocaleString('en', { dateStyle: 'full' });
    time.textContent = commit.datetime?.toLocaleTimeString('en', { timeStyle: 'short' });
    author.textContent = commit.author;
    lines.textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.left = `${event.clientX + 15}px`;
    tooltip.style.top = `${event.clientY + 15}px`;
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

    const svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    const xScale = d3
        .scaleTime()
        .domain(d3.extent(commits, (d) => d.datetime))
        .range([usableArea.left, usableArea.right])
        .nice();

    const yScale = d3
        .scaleLinear()
        .domain([0, 24])
        .range([usableArea.bottom, usableArea.top]);

    const gridlines = svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);

    gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

    gridlines.selectAll('line').style('stroke', (d) => {
        return d >= 6 && d <= 18 ? 'oklch(70% 0.1 50)' : 'oklch(50% 0.1 250)';
    });

    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3
        .axisLeft(yScale)
        .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00'); 

    svg.append('g')
       .attr('transform', `translate(0, ${usableArea.bottom})`)
       .call(xAxis);

    svg.append('g')
       .attr('transform', `translate(${usableArea.left}, 0)`)
       .call(yAxis);

    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
    
    const rScale = d3
        .scaleSqrt()
        .domain([minLines, maxLines])
        .range([2, 30]); 


    const dots = svg.append('g').attr('class', 'dots');
    
    dots.selectAll('circle')
        .data(sortedCommits) 
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', (d) => rScale(d.totalLines)) 
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
}

let data = await loadData();
let commits = processCommits(data);
window.commits = commits; 
renderCommitInfo(data, commits);

renderScatterPlot(data, commits);