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

console.log(commits);
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


let data = await loadData();
let commits = processCommits(data);

window.commits = commits; 

renderCommitInfo(data, commits);