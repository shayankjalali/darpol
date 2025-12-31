// Elements
const tickerInput = document.getElementById('ticker-input');
const intervalSelect = document.getElementById('interval');
const periodSelect = document.getElementById('period');
const weightInput = document.getElementById('weight');
const runBtn = document.getElementById('run-btn');
const statSymbol = document.getElementById('stat-symbol');
const scoreEl = document.getElementById('score');
const activityEl = document.getElementById('activity');
const absorptionCountEl = document.getElementById('absorption-count');
const vwapCountEl = document.getElementById('vwap-count');
const highPriceEl = document.getElementById('high-price');
const lowPriceEl = document.getElementById('low-price');
const barCountEl = document.getElementById('bar-count');
const priceInfo = document.getElementById('price-info');
const volumeInfo = document.getElementById('volume-info');
const signalsList = document.getElementById('signals-list');
const modalOverlay = document.getElementById('modal-overlay');
const modalClose = document.getElementById('modal-close');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const filterBtns = document.querySelectorAll('.filter-btn');

let priceChart = null;
let volumeChart = null;
let allSignals = [];
let currentFilter = 'all';
let chartData = null;

// Events
runBtn.addEventListener('click', analyze);
tickerInput.addEventListener('keypress', e => { if (e.key === 'Enter') analyze(); });
modalClose.addEventListener('click', () => modalOverlay.classList.remove('active'));
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) modalOverlay.classList.remove('active'); });

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderSignals();
    });
});

async function analyze() {
    const ticker = tickerInput.value.toUpperCase().trim();
    if (!ticker) {
        tickerInput.focus();
        return;
    }

    runBtn.textContent = 'Loading...';
    runBtn.disabled = true;

    try {
        const res = await fetch('/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ticker,
                interval: intervalSelect.value,
                period: periodSelect.value,
                weight: parseInt(weightInput.value)
            })
        });

        const data = await res.json();
        if (data.error) {
            alert('Error: ' + data.error);
            return;
        }

        chartData = data;
        render(data, ticker);
    } catch (err) {
        alert('Error: ' + err.message);
    } finally {
        runBtn.textContent = 'Analyze';
        runBtn.disabled = false;
    }
}

function render(data, ticker) {
    // Stats
    statSymbol.textContent = ticker;
    
    const score = Math.round(data.score);
    scoreEl.textContent = score + '/100';

    let activity, cls;
    if (score >= 67) { activity = 'High'; cls = 'high'; }
    else if (score >= 34) { activity = 'Moderate'; cls = 'moderate'; }
    else { activity = 'Low'; cls = 'low'; }
    activityEl.textContent = activity;
    activityEl.className = 'stat-value ' + cls;

    absorptionCountEl.textContent = data.absorption_count;
    vwapCountEl.textContent = data.vwap_count;

    const high = Math.max(...data.prices);
    const low = Math.min(...data.prices);
    highPriceEl.textContent = '$' + high.toFixed(2);
    lowPriceEl.textContent = '$' + low.toFixed(2);
    barCountEl.textContent = data.prices.length;

    priceInfo.textContent = `${intervalSelect.value} • ${periodSelect.value}`;
    volumeInfo.textContent = `${intervalSelect.value} • ${periodSelect.value}`;

    // Charts
    drawCharts(data);

    // Signals
    processSignals(data);
}

function drawCharts(data) {
    const period = periodSelect.value;
    
    // Smart label formatting based on period
    const labels = data.times.map(t => {
        const d = new Date(t);
        if (period === '1d') {
            // 1 day: show time only
            return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        } else {
            // 5+ days: show date only (cleaner)
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    });

    const absIdx = data.absorption_signals.map(s => s.index);
    const vwapIdx = data.vwap_signals.map(s => s.index);

    const pointColors = data.prices.map((_, i) => {
        if (absIdx.includes(i)) return '#00bcd4';
        if (vwapIdx.includes(i)) return '#ab47bc';
        return 'transparent';
    });

    const pointRadius = data.prices.map((_, i) => (absIdx.includes(i) || vwapIdx.includes(i)) ? 5 : 0);

    const volColors = data.volumes.map((_, i) => {
        if (absIdx.includes(i)) return '#00bcd4';
        if (vwapIdx.includes(i)) return '#ab47bc';
        return '#ff9800';
    });

    if (priceChart) priceChart.destroy();
    if (volumeChart) volumeChart.destroy();

    // Price Chart
    const priceCtx = document.getElementById('price-chart').getContext('2d');
    priceChart = new Chart(priceCtx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                data: data.prices,
                borderColor: '#ff9800',
                borderWidth: 2,
                pointBackgroundColor: pointColors,
                pointBorderColor: pointColors,
                pointRadius,
                pointHoverRadius: 7,
                fill: true,
                backgroundColor: createGradient(priceCtx, 'rgba(255, 152, 0, 0.2)', 'rgba(255, 152, 0, 0)'),
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1e222d',
                    titleColor: '#d1d4dc',
                    bodyColor: '#d1d4dc',
                    borderColor: '#363c4e',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        title: ctx => formatFullTime(data.times[ctx[0].dataIndex]),
                        label: ctx => {
                            const i = ctx.dataIndex;
                            let lbl = 'Price: $' + ctx.raw.toFixed(2);
                            if (absIdx.includes(i)) lbl += '  •  Absorption Signal';
                            if (vwapIdx.includes(i)) lbl += '  •  VWAP Signal';
                            return lbl;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    ticks: { color: '#5d606b', maxTicksLimit: 10, font: { size: 10 } },
                    grid: { color: '#2a2e39', drawBorder: false }
                },
                y: {
                    display: true,
                    position: 'right',
                    ticks: { color: '#5d606b', font: { size: 10 }, callback: v => '$' + v.toFixed(0) },
                    grid: { color: '#2a2e39', drawBorder: false }
                }
            }
        }
    });

    // Volume Chart - WITH HOVER TOOLTIPS
    const volCtx = document.getElementById('volume-chart').getContext('2d');
    volumeChart = new Chart(volCtx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{ data: data.volumes, backgroundColor: volColors }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1e222d',
                    titleColor: '#d1d4dc',
                    bodyColor: '#d1d4dc',
                    borderColor: '#363c4e',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        title: ctx => formatFullTime(data.times[ctx[0].dataIndex]),
                        label: ctx => {
                            const i = ctx.dataIndex;
                            let lbl = 'Volume: ' + fmtVol(ctx.raw);
                            if (absIdx.includes(i)) lbl += '  •  Absorption Signal';
                            if (vwapIdx.includes(i)) lbl += '  •  VWAP Signal';
                            return lbl;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    ticks: { color: '#5d606b', maxTicksLimit: 10, font: { size: 10 } },
                    grid: { color: '#2a2e39', drawBorder: false }
                },
                y: {
                    display: true,
                    position: 'right',
                    ticks: { color: '#5d606b', font: { size: 10 }, callback: v => fmtVol(v) },
                    grid: { color: '#2a2e39', drawBorder: false }
                }
            }
        }
    });
}

function createGradient(ctx, color1, color2) {
    const g = ctx.createLinearGradient(0, 0, 0, 400);
    g.addColorStop(0, color1);
    g.addColorStop(1, color2);
    return g;
}

function processSignals(data) {
    allSignals = [];

    data.absorption_signals.forEach(s => {
        allSignals.push({
            type: 'absorption',
            time: s.time,
            ts: new Date(s.time).getTime(),
            volume: s.volume,
            avgVolume: s.avg_volume,
            zScore: s.z_score,
            priceChange: s.price_change
        });
    });

    data.vwap_signals.forEach(s => {
        allSignals.push({
            type: 'vwap',
            time: s.time,
            ts: new Date(s.time).getTime(),
            volume: s.volume || 0,
            closePrice: s.close_price,
            vwap: s.vwap,
            deviation: s.deviation,
            direction: s.direction
        });
    });

    allSignals.sort((a, b) => b.ts - a.ts);
    renderSignals();
}

function renderSignals() {
    let list = allSignals;
    if (currentFilter !== 'all') list = allSignals.filter(s => s.type === currentFilter);

    if (!list.length) {
        signalsList.innerHTML = '<div class="empty-state">No signals found</div>';
        return;
    }

    signalsList.innerHTML = list.map(s => {
        const time = fmtTime(s.time);
        const desc = s.type === 'absorption' ? 'Large order absorbed' : 'Price snapped back to VWAP';
        const vol = s.volume ? fmtVol(s.volume) : '—';
        const typeLabel = s.type === 'absorption' ? 'ABS' : 'VWAP';

        return `
            <div class="signal-item" data-signal='${JSON.stringify(s)}'>
                <div class="signal-dot ${s.type}"></div>
                <div class="signal-content">
                    <div class="signal-time">${time}</div>
                    <div class="signal-desc">${desc}</div>
                </div>
                <div class="signal-meta">
                    <div class="signal-type ${s.type}">${typeLabel}</div>
                    <div class="signal-volume">${vol}</div>
                </div>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.signal-item').forEach(el => {
        el.addEventListener('click', () => openModal(JSON.parse(el.dataset.signal)));
    });
}

function openModal(s) {
    modalTitle.textContent = (s.type === 'absorption' ? 'Absorption' : 'VWAP') + ' Signal';

    let html = '';
    if (s.type === 'absorption') {
        const ratio = (s.volume / s.avgVolume).toFixed(1);
        html = `
            <div class="modal-row"><span class="modal-label">Time</span><span class="modal-value">${fmtTime(s.time)}</span></div>
            <div class="modal-row"><span class="modal-label">Volume</span><span class="modal-value">${fmtVol(s.volume)}</span></div>
            <div class="modal-row"><span class="modal-label">Avg Volume</span><span class="modal-value">${fmtVol(s.avgVolume)}</span></div>
            <div class="modal-row"><span class="modal-label">Ratio</span><span class="modal-value">${ratio}x normal</span></div>
            <div class="modal-row"><span class="modal-label">Z-Score</span><span class="modal-value">${s.zScore.toFixed(2)}</span></div>
            <div class="modal-row"><span class="modal-label">Price Change</span><span class="modal-value">${(s.priceChange * 100).toFixed(3)}%</span></div>
            <div class="modal-note">Volume was ${ratio}x higher than normal while price barely moved. This pattern may indicate a large institutional order being absorbed by the market.</div>
        `;
    } else {
        const vol = s.volume ? fmtVol(s.volume) : '—';
        html = `
            <div class="modal-row"><span class="modal-label">Time</span><span class="modal-value">${fmtTime(s.time)}</span></div>
            <div class="modal-row"><span class="modal-label">Close Price</span><span class="modal-value">$${s.closePrice.toFixed(2)}</span></div>
            <div class="modal-row"><span class="modal-label">VWAP</span><span class="modal-value">$${s.vwap.toFixed(2)}</span></div>
            <div class="modal-row"><span class="modal-label">Deviation</span><span class="modal-value">${(s.deviation * 100).toFixed(3)}%</span></div>
            <div class="modal-row"><span class="modal-label">Direction</span><span class="modal-value">${s.direction.replace('_', ' ')}</span></div>
            <div class="modal-row"><span class="modal-label">Volume</span><span class="modal-value">${vol}</span></div>
            <div class="modal-note">Price deviated from VWAP then snapped back. This pattern is consistent with algorithmic execution strategies used by institutional traders.</div>
        `;
    }

    modalBody.innerHTML = html;
    modalOverlay.classList.add('active');
}

function formatFullTime(t) {
    return new Date(t).toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

function fmtTime(t) {
    return new Date(t).toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

function fmtVol(v) {
    if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
    if (v >= 1e3) return (v / 1e3).toFixed(0) + 'K';
    return v.toString();
}