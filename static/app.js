const ids = ['population','initial_infected','beta','gamma','vaccination','intervention_day','intervention_strength','days'];
const byId = id => document.getElementById(id);
let mapData = null, playTimer = null;
document.querySelectorAll('input[type="range"]').forEach(input => input.addEventListener('input', () => {
  const output = input.parentElement.querySelector('output');
  output.value = input.id === 'vaccination' || input.id === 'intervention_strength' ? `${Math.round(input.value * 100)}%` : input.id === 'days' ? `${input.value} days` : Number(input.value).toFixed(2);
}));
byId('mobility').addEventListener('input', e => e.target.parentElement.querySelector('output').value = `${Math.round(e.target.value * 100)}%`);
function values(){ return Object.fromEntries(ids.map(id => [id, Number(byId(id).value)])); }
function paintMap(day) {
  if (!mapData) return;

  const index = Math.max(0, Math.min(Number(day), mapData.days.length - 1));
  const counts = mapData.grid[index];
  const maximum = Math.max(1, ...counts);

  byId('map-day').value = index;
  byId('map-day-value').value = index;

  const grid = byId('map-grid');
  grid.style.gridTemplateColumns = `repeat(${mapData.cols}, minmax(0, 1fr))`;

  const compact = new Intl.NumberFormat(undefined, {
    notation: 'compact',
    maximumFractionDigits: 1
  });

  grid.innerHTML = counts.map((count, cell) => {
    const intensity = Math.log1p(count) / Math.log1p(maximum);
    const light = 96 - intensity * 43;

    return `
      <div
        class="region-cell${cell === mapData.seed_region ? ' seed' : ''}"
        style="background: hsl(22 78% ${light}%)"
        aria-label="Region ${cell + 1}: ${count.toLocaleString()} infected"
        title="Region ${cell + 1}: ${count.toLocaleString()} infected"
      >
        <strong>${compact.format(count)}</strong>
      </div>
    `;
  }).join('');
}
async function runMap(){
  const params={...values(),mobility:Number(byId('mobility').value),seed_region:Number(byId('seed_region').value)};
  const response=await fetch('/api/map-simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(params)});
  const data=await response.json();if(!response.ok)throw new Error(data.error);
  mapData=data;byId('map-day').max=data.days.at(-1);paintMap(0);
}
function draw(data){
  const canvas=byId('chart'), rect=canvas.getBoundingClientRect(), dpr=window.devicePixelRatio||1;
  canvas.width=rect.width*dpr; canvas.height=rect.height*dpr;
  const ctx=canvas.getContext('2d'); ctx.scale(dpr,dpr);
  const w=rect.width,h=rect.height,p={l:58,r:12,t:14,b:34}, plotW=w-p.l-p.r,plotH=h-p.t-p.b;
  const max=Math.max(...data.susceptible,...data.infected,...data.recovered)*1.08;
  ctx.font='11px DM Sans, sans-serif';ctx.strokeStyle='rgba(152,174,188,.18)';ctx.fillStyle='#98aebc';ctx.lineWidth=1;
  for(let n=0;n<=4;n++){const y=p.t+plotH*n/4;ctx.beginPath();ctx.moveTo(p.l,y);ctx.lineTo(w-p.r,y);ctx.stroke();ctx.fillText(Math.round(max*(1-n/4)).toLocaleString(),2,y+4)}
  for(let n=0;n<=6;n++){const x=p.l+plotW*n/6;ctx.fillText(Math.round(data.days.at(-1)*n/6),x-5,h-8)}
  [[data.susceptible,'#2dd4bf'],[data.infected,'#f43f5e'],[data.recovered,'#a3e635']].forEach(([series,color])=>{ctx.beginPath();series.forEach((v,j)=>{const x=p.l+plotW*j/(series.length-1),y=p.t+plotH*(1-v/max);j?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.strokeStyle=color;ctx.lineWidth=2.5;ctx.stroke()});
}
async function run(){
  const button=byId('run');button.disabled=true;button.textContent='Calculating…';
  try{
    const response=await fetch('/api/simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(values())});
    const data=await response.json();if(!response.ok)throw new Error(data.error);
    const m=data.metrics;byId('metrics').innerHTML=[['Peak infected',m.peak_infected.toLocaleString()],['Peak occurs',`Day ${m.peak_day}`],['Total infected',m.total_infected.toLocaleString()],['R₀ (β / γ)',m.basic_reproduction_number]].map(([a,b])=>`<div class="metric"><span>${a}</span><strong>${b}</strong></div>`).join('');
    byId('summary').textContent=`The model estimates a peak of ${m.peak_infected.toLocaleString()} simultaneous infections on day ${m.peak_day}. By the end, about ${m.total_infected.toLocaleString()} people have been infected. After the intervention, the effective reproduction number is ${m.effective_reproduction_after_intervention}.`;
    draw(data);await runMap();
  }catch(error){byId('summary').textContent=error.message;}
  finally{button.disabled=false;button.textContent='Run simulation';}
}
byId('run').addEventListener('click',run);byId('map-day').addEventListener('input',e=>paintMap(e.target.value));
byId('play-map').addEventListener('click',()=>{if(playTimer){clearInterval(playTimer);playTimer=null;byId('play-map').textContent='▶ Play spread';return}if(!mapData)return;let day=Number(byId('map-day').value);if(day>=mapData.days.length-1)day=0;byId('play-map').textContent='Ⅱ Pause';playTimer=setInterval(()=>{day++;paintMap(day);if(day>=mapData.days.length-1){clearInterval(playTimer);playTimer=null;byId('play-map').textContent='▶ Play spread'}},120)});
window.addEventListener('resize',()=>{if(byId('metrics').childElementCount)run()});run();
