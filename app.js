
document.addEventListener("DOMContentLoaded", () => {

  /* ----------------------------
     Real Data (Demo Purposes)
  ---------------------------- */
  const state = {
    goals: [
      { name: "Emergency Fund", target: 500, current: 330 },
      { name: "Guitar Upgrade", target: 600, current: 220 }
    ],
    envelopes: [
      { name: "Groceries", budget: 250, spent: 180 },
      { name: "Fun", budget: 120, spent: 96 },
      { name: "Pets", budget: 80, spent: 22 }
    ]
  };

  const bloomSvg = document.getElementById("bloom-garden");
  const bloomCaption = document.getElementById("garden-caption");
  const petalSvg = document.getElementById("petal-chart");
  const envelopeCards = document.getElementById("envelope-cards");

  /* ----------------------------
     BLOOM GARDEN (with animation)
  ---------------------------- */
  function renderBloomGarden() {
    bloomSvg.innerHTML = "";

    const totalTarget = state.goals.reduce((a,g)=>a+g.target,0);
    const current = state.goals.reduce((a,g)=>a+g.current,0);

    let pct = totalTarget ? (current / totalTarget) * 100 : 0;
    pct = Math.min(100, pct);

    const SVG_NS = "http://www.w3.org/2000/svg";
    const cx = 60;
    const groundY = 135;

    // Ground
    const ground = document.createElementNS(SVG_NS, "rect");
    ground.setAttribute("x","0");
    ground.setAttribute("y",String(groundY));
    ground.setAttribute("width","120");
    ground.setAttribute("height","25");
    ground.setAttribute("fill","#f1e0c7");
    bloomSvg.appendChild(ground);

    // Stem
    const stem = document.createElementNS(SVG_NS, "rect");
    stem.setAttribute("x", cx - 2);
    stem.setAttribute("y", groundY - 70);
    stem.setAttribute("width", 4);
    stem.setAttribute("height", 70);
    stem.setAttribute("fill", "#4a8f4a");
    bloomSvg.appendChild(stem);

    // Leaf
    const leaf = document.createElementNS(SVG_NS, "ellipse");
    leaf.setAttribute("cx", cx + 14);
    leaf.setAttribute("cy", groundY - 35);
    leaf.setAttribute("rx", 10);
    leaf.setAttribute("ry", 6);
    leaf.setAttribute("fill", "#7fbf7b");
    bloomSvg.appendChild(leaf);

    const base = 10;
    const extra = (pct / 100) * 14;
    const bloomR = base + extra;

    const bloom = document.createElementNS(SVG_NS, "circle");
    bloom.setAttribute("cx", cx);
    bloom.setAttribute("cy", groundY - 80);
    bloom.setAttribute("r", bloomR);
    bloom.setAttribute("fill", "#ffd27f");
    bloomSvg.appendChild(bloom);

    const center = document.createElementNS(SVG_NS, "circle");
    center.setAttribute("cx", cx);
    center.setAttribute("cy", groundY - 80);
    center.setAttribute("r", bloomR * 0.45);
    center.setAttribute("fill", "#ffb74d");
    bloomSvg.appendChild(center);

    bloomCaption.textContent =
      `Your savings garden is ${pct.toFixed(0)}% in bloom (${current}/${totalTarget}).`;

    bloomSvg.classList.remove("grow-animate");
    setTimeout(()=> bloomSvg.classList.add("grow-animate"), 50);
  }

  /* ----------------------------
     PETAL CHART (real envelope data)
  ---------------------------- */
  function renderPetalChart() {
    petalSvg.innerHTML = "";
    const SVG_NS = "http://www.w3.org/2000/svg";
    const cx = 80, cy = 80;

    state.envelopes.forEach((env,i)=>{
      const pct = env.budget ? Math.min(100, (env.spent/env.budget)*100) : 0;
      const angle = (i/state.envelopes.length)*2*Math.PI - Math.PI/2;
      const length = 20 + (pct/100)*45;

      const x2 = cx + Math.cos(angle)*length;
      const y2 = cy + Math.sin(angle)*length;

      const line = document.createElementNS(SVG_NS,"line");
      line.setAttribute("x1",cx);
      line.setAttribute("y1",cy);
      line.setAttribute("x2",x2);
      line.setAttribute("y2",y2);
      line.setAttribute("stroke","#a5d6a7");
      line.setAttribute("stroke-width","12");
      line.setAttribute("stroke-linecap","round");

      petalSvg.appendChild(line);
    });

    const center = document.createElementNS("http://www.w3.org/2000/svg","circle");
    center.setAttribute("cx",cx);
    center.setAttribute("cy",cy);
    center.setAttribute("r",14);
    center.setAttribute("fill","#7cb98b");
    petalSvg.appendChild(center);
  }

  /* ----------------------------
     COZY ENVELOPE CARDS
  ---------------------------- */
  function renderEnvelopeCards() {
    envelopeCards.innerHTML = "";
    state.envelopes.forEach(env=>{
      const card=document.createElement("div");
      card.className="envelope-card";
      card.innerHTML=`
        <strong>${env.name}</strong><br>
        Budget: $${env.budget}<br>
        Spent: $${env.spent}
      `;
      envelopeCards.appendChild(card);
    });
  }

  renderBloomGarden();
  renderPetalChart();
  renderEnvelopeCards();

});


/* === Bloom Garden === */
function renderBloomGarden(){
  const el = document.getElementById("bloom-garden");
  const cap = document.getElementById("garden-caption");
  if(!el||!cap) return;
  el.innerHTML="";
  const total = sum(state.goals,"target");
  const current = state.goals.reduce((a,g)=>a+Number(g.current||0),0);
  let pct = total? Math.min(100,(current/total)*100):0;

  const NS="http://www.w3.org/2000/svg";
  const cx=60,gy=135;

  const ground=document.createElementNS(NS,"rect");
  ground.setAttribute("x",0);ground.setAttribute("y",gy);
  ground.setAttribute("width",120);ground.setAttribute("height",25);
  ground.setAttribute("fill","#f1e0c7");
  el.appendChild(ground);

  const stem=document.createElementNS(NS,"rect");
  stem.setAttribute("x",cx-2);stem.setAttribute("y",gy-70);
  stem.setAttribute("width",4);stem.setAttribute("height",70);
  stem.setAttribute("fill","#4a8f4a");
  el.appendChild(stem);

  const leaf=document.createElementNS(NS,"ellipse");
  leaf.setAttribute("cx",cx+14);leaf.setAttribute("cy",gy-35);
  leaf.setAttribute("rx",10);leaf.setAttribute("ry",6);
  leaf.setAttribute("fill","#7fbf7b");
  el.appendChild(leaf);

  const bloomR=10+(pct/100)*14;
  const bloom=document.createElementNS(NS,"circle");
  bloom.setAttribute("cx",cx);bloom.setAttribute("cy",gy-80);
  bloom.setAttribute("r",bloomR);bloom.setAttribute("fill","#ffd27f");
  el.appendChild(bloom);

  const center=document.createElementNS(NS,"circle");
  center.setAttribute("cx",cx);center.setAttribute("cy",gy-80);
  center.setAttribute("r",bloomR*0.45);center.setAttribute("fill","#ffb74d");
  el.appendChild(center);

  cap.textContent = total?`Your savings garden is ${pct.toFixed(0)}% in bloom (${formatCurrency(current)} saved).`:"Add savings goals.";

  el.classList.remove("grow-animate");
  setTimeout(()=>el.classList.add("grow-animate"),50);
}

/* === Petal Chart === */
function renderPetalChart(){
  const svg=document.getElementById("petal-chart");
  if(!svg) return;
  svg.innerHTML="";
  const NS="http://www.w3.org/2000/svg";
  const cx=80,cy=80;
  const envs=state.envelopes.filter(e=>e.name);

  if(envs.length===0) return;

  envs.forEach((env,i)=>{
    const pct=env.budget?Math.min(100,(env.spent/env.budget)*100):0;
    const ang=(i/envs.length)*2*Math.PI - Math.PI/2;
    const len=20+(pct/100)*45;
    const x2=cx+Math.cos(ang)*len;
    const y2=cy+Math.sin(ang)*len;

    const line=document.createElementNS(NS,"line");
    line.setAttribute("x1",cx);line.setAttribute("y1",cy);
    line.setAttribute("x2",x2);line.setAttribute("y2",y2);
    line.setAttribute("stroke","#a5d6a7");
    line.setAttribute("stroke-width",12);
    line.setAttribute("stroke-linecap","round");
    svg.appendChild(line);
  });

  const center=document.createElementNS(NS,"circle");
  center.setAttribute("cx",cx);center.setAttribute("cy",cy);
  center.setAttribute("r",14);center.setAttribute("fill","#7cb98b");
  svg.appendChild(center);
}

/* === Envelope Cards === */
function renderEnvelopeCards(){
  const wrap=document.getElementById("envelope-cards");
  if(!wrap) return;
  wrap.innerHTML="";
  if(state.envelopes.length===0){wrap.innerHTML="<p>No envelopes yet.</p>";return;}

  state.envelopes.forEach(env=>{
    const card=document.createElement("div");
    card.className="envelope-card";
    const avail = Number(env.budget||0)-Number(env.spent||0);
    card.innerHTML = `
      <strong>${env.name}</strong><br>
      Budget: ${formatCurrency(env.budget)}<br>
      Spent: ${formatCurrency(env.spent)}<br>
      Left: ${formatCurrency(Math.max(0,avail))}
    `;
    wrap.appendChild(card);
  });
}

/* Hook into main render */
const oldRenderAll = renderAll;
renderAll = function(){
  oldRenderAll();
  renderBloomGarden();
  renderPetalChart();
  renderEnvelopeCards();
};
