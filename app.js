const K = "pulse.v1",
  GK = "pulse.goal",
  $ = (s) => document.querySelector(s);
let D = [],
  goal = null,
  range = 90,
  metric = "k",
  hmode = "a",
  sel = null,
  shown = 0,
  tt;
const norm = (e) => ({ t: null, c: null, k: null, s: null, i: null, ...e });
try {
  D = JSON.parse(localStorage.getItem(K) || "[]").map(norm);
  goal = JSON.parse(localStorage.getItem(GK) || "null");
} catch (e) {
  D = [];
}
const save = () => {
  try {
    localStorage.setItem(K, JSON.stringify(D));
    localStorage.setItem(GK, JSON.stringify(goal));
  } catch (e) {}
};
const p = (n) => String(n).padStart(2, "0");
const iso = (d) =>
  d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
const pd = (s) => {
  const [a, b, c] = s.split("-");
  return new Date(+a, b - 1, +c);
};
const ad = (s, n) => {
  const d = pd(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};
const br = (s) => {
  const [a, b, c] = s.split("-");
  return c + "/" + b + "/" + a;
};
const br2 = (s) => br(s).slice(0, 5);
const wd = (s) => pd(s).toLocaleDateString("en-GB", { weekday: "long" });
const diff = (a, b) => Math.round((pd(a) - pd(b)) / 864e5);
const f1 = (n) => n.toFixed(1),
  r1 = (v) => Math.round(v * 10) / 10;
const num = (v) => {
  const x = parseFloat(String(v).replace(",", "."));
  return isNaN(x) ? null : x;
};
const mmss = (s) => Math.floor(s / 60) + ":" + p(s % 60);
const today = () => iso(new Date());
const sess = (e) => e.t || e.k;
const cl = (v) => (v < 0 ? "dn" : v > 0 ? "gn" : "eq");
const dv = (v) => (v < 0 ? "▼ " : v > 0 ? "▲ " : "● ") + Math.abs(v).toFixed(1);
const sg = (v) => (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(1);
const ob = (s) => {
  let r = null;
  for (const e of D) {
    if (e.d <= s) r = e;
    else break;
  }
  return r;
};
const op = (id, on) => $(id).classList.toggle("o", on);
const toast = (m) => {
  const t = $("#ts");
  t.textContent = m;
  t.classList.add("o");
  clearTimeout(tt);
  tt = setTimeout(() => t.classList.remove("o"), 2800);
};
function arm(b, fn) {
  const o = b.textContent;
  let a = 0;
  b.onclick = () => {
    if (a) {
      a = 0;
      b.textContent = o;
      fn();
    } else {
      a = 1;
      b.textContent = "Click again to confirm";
      setTimeout(() => {
        a = 0;
        b.textContent = o;
      }, 3000);
    }
  };
}
function count(el, to) {
  const from = shown,
    t0 = performance.now();
  shown = to;
  (function s(t) {
    const k = Math.min(1, (t - t0) / 900),
      e = 1 - Math.pow(1 - k, 3);
    el.textContent = (from + (to - from) * e).toFixed(1);
    if (k < 1) requestAnimationFrame(s);
  })(t0);
}

function render() {
  D.sort((a, b) => (a.d < b.d ? -1 : 1));
  if (!sel) sel = D.length ? D[D.length - 1].d : today();
  renderHero();
  renderChart();
  renderHeat();
  renderDay();
  renderBars();
  renderStats();
}

function renderHero() {
  const L = D[D.length - 1],
    R = [
      ["Yesterday", 1],
      ["Last week", 7],
      ["Last month", 30],
      ["Since start", 0],
    ];
  $("#cmp").innerHTML = R.map(([t, n], i) => {
    const r = L && (n ? ob(ad(L.d, -n)) : D.length > 1 ? D[0] : null);
    let b = '<b class="dl eq">—</b><small>Not enough data yet</small>';
    if (r) {
      const q = r1(L.w - r.w);
      b = `<b class="dl ${cl(q)}">${dv(q)}</b><small>kg vs ${f1(r.w)} · ${br2(r.d)}</small>`;
    }
    return `<div class="cd" style="--n:${i + 1}"><span class="lb">${t}</span>${b}</div>`;
  }).join("");
  if (L) {
    count($("#bw"), L.w);
    $("#sb").textContent = wd(L.d) + " · " + br(L.d);
  } else {
    $("#bw").textContent = "--.-";
    $("#sb").textContent = "Log your first day, or load demo data from Data";
  }
  let pc = 0,
    tx = "Set a goal weight",
    pp = "";
  if (goal) {
    tx = "Goal " + f1(goal) + " kg";
  }
  if (goal && L) {
    const st = D[0].w;
    pc = st === goal ? 1 : Math.max(0, Math.min(1, (L.w - st) / (goal - st)));
    tx =
      pc >= 1 || Math.abs(goal - L.w) < 0.05
        ? "Goal reached"
        : f1(Math.abs(goal - L.w)) + " kg to go";
    pp = Math.round(pc * 100) + "%";
  }
  $("#gx").textContent = tx;
  $("#gp").textContent = pp;
  $("#pf").style.width = pc * 100 + "%";
}

function renderChart() {
  const box = $("#ch");
  if (D.length < 2) {
    box.innerHTML =
      '<div class="em">Log at least two days to draw the curve</div>';
    return;
  }
  const L = D[D.length - 1],
    S = range ? D.filter((e) => diff(L.d, e.d) <= range) : D;
  if (S.length < 2) {
    box.innerHTML = '<div class="em">Not enough entries in this range</div>';
    return;
  }
  const W = box.clientWidth || 700,
    H = 270,
    ml = 44,
    mr = 14,
    mt = 14,
    mb = 26,
    t0 = pd(S[0].d).getTime(),
    t1 = pd(L.d).getTime();
  const ws = S.map((e) => e.w);
  if (goal) ws.push(goal);
  let lo = Math.min(...ws),
    hi = Math.max(...ws);
  const pad = (hi - lo || 1) * 0.15;
  lo -= pad;
  hi += pad;
  const X = (d) => ml + ((pd(d).getTime() - t0) / (t1 - t0)) * (W - ml - mr),
    Y = (w) => mt + (1 - (w - lo) / (hi - lo)) * (H - mt - mb);
  const P = S.map((e) => X(e.d).toFixed(1) + "," + Y(e.w).toFixed(1)),
    ln = "M" + P.join("L");
  const area =
    ln + `L${X(L.d).toFixed(1)},${H - mb}L${X(S[0].d).toFixed(1)},${H - mb}Z`;
  const MA =
    "M" +
    S.map((e, i) => {
      const a = S.slice(Math.max(0, i - 6), i + 1);
      return (
        X(e.d).toFixed(1) +
        "," +
        Y(a.reduce((s, v) => s + v.w, 0) / a.length).toFixed(1)
      );
    }).join("L");
  let g = "";
  for (let i = 0; i < 4; i++) {
    const v = lo + ((hi - lo) * i) / 3,
      y = Y(v);
    g += `<line class="gd" x1="${ml}" x2="${W - mr}" y1="${y}" y2="${y}"/><text x="${ml - 8}" y="${y + 4}" text-anchor="end">${v.toFixed(1)}</text>`;
  }
  [0, 0.33, 0.66, 1].forEach((f, i) => {
    const e = S[Math.round(f * (S.length - 1))];
    g += `<text x="${X(e.d)}" y="${H - 6}" text-anchor="${i ? (i == 3 ? "end" : "middle") : "start"}">${br2(e.d)}</text>`;
  });
  if (goal) {
    const y = Y(goal);
    g += `<line x1="${ml}" x2="${W - mr}" y1="${y}" y2="${y}" stroke="#ff6b35" stroke-dasharray="6 5" opacity=".7"/><text class="gz" x="${W - mr}" y="${y - 5}" text-anchor="end">goal ${f1(goal)}</text>`;
  }
  const lp = P[P.length - 1].split(",");
  box.innerHTML = `<svg width="${W}" height="${H}" style="display:block"><defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#19e3c1" stop-opacity=".35"/><stop offset="1" stop-color="#19e3c1" stop-opacity="0"/></linearGradient></defs>${g}<path class="ar" d="${area}" fill="url(#ga)"/><path class="mv" d="${MA}"/><path class="ln" pathLength="1" d="${ln}"/><circle cx="${lp[0]}" cy="${lp[1]}" r="4.5" fill="#19e3c1"/><g id="hv"><line x1="0" x2="0" y1="${mt}" y2="${H - mb}" stroke="#ffffff30"/><circle id="cc" cx="0" cy="0" r="5.5" fill="#19e3c1" stroke="#0a0c11" stroke-width="2"/></g></svg><div class="tp" id="tp"></div>`;
  const sv = box.firstChild,
    hv = $("#hv"),
    cc = $("#cc"),
    tp = $("#tp");
  sv.onpointermove = (ev) => {
    const mx = ev.clientX - sv.getBoundingClientRect().left;
    let b = 0,
      bd = 1e9;
    S.forEach((e, i) => {
      const q = Math.abs(X(e.d) - mx);
      if (q < bd) {
        bd = q;
        b = i;
      }
    });
    const e = S[b],
      pr = D[D.indexOf(e) - 1],
      q = pr ? r1(e.w - pr.w) : null;
    hv.style.opacity = 1;
    hv.style.transform = `translateX(${X(e.d)}px)`;
    cc.style.transform = `translateY(${Y(e.w)}px)`;
    tp.innerHTML = `${wd(e.d).slice(0, 3)} ${br(e.d)}<br><b>${f1(e.w)} kg</b>${q !== null ? ` <span class="${cl(q)}">${dv(q)}</span>` : ""}`;
    tp.style.opacity = 1;
    tp.style.left = Math.max(0, Math.min(W - 130, X(e.d) + 12)) + "px";
    tp.style.top = Math.max(0, Y(e.w) - 52) + "px";
  };
  sv.onpointerleave = () => {
    hv.style.opacity = 0;
    tp.style.opacity = 0;
  };
}

function renderHeat() {
  const mp = {};
  D.forEach((e, i) => (mp[e.d] = i));
  const t = today(),
    st = ad(t, -(364 + pd(t).getDay())),
    mk = Math.max(1, ...D.map((e) => e.k || 0));
  let h = "",
    ml = "",
    pm = -1;
  for (let x = st, i = 0; x <= t; x = ad(x, 1), i++) {
    if (i % 7 === 0) {
      const mo = pd(x).getMonth();
      ml += `<span>${mo !== pm ? pd(x).toLocaleDateString("en-GB", { month: "short" }) : ""}</span>`;
      pm = mo;
    }
    const j = mp[x],
      e = D[j];
    let k = "";
    if (e) {
      if (hmode === "a")
        k =
          e.k > 0
            ? "l" + Math.min(4, Math.ceil((e.k / mk) * 4))
            : e.t
              ? "l1"
              : "rs";
      else {
        const q = j ? r1(e.w - D[j - 1].w) : 0;
        k =
          q === 0
            ? "rs"
            : (q < 0 ? "g" : "u") + Math.min(4, Math.ceil(Math.abs(q) / 0.25));
      }
    }
    h += `<i class="ce ${k}${x === t ? " td" : ""}${x === sel ? " sl" : ""}" data-d="${x}" style="--i:${Math.floor(i / 7)}"></i>`;
  }
  $("#ml").innerHTML = ml;
  $("#hm").innerHTML = h;
  $("#hc").textContent =
    D.filter((e) => e.d >= st && sess(e)).length + " sessions in the last year";
  const lg = (c) => `<i class="ce ${c}"></i>`;
  $("#lgd").innerHTML =
    hmode === "a"
      ? `Less ${["", "l1", "l2", "l3", "l4"].map(lg).join("")} More &nbsp;·&nbsp; ${lg("rs")} weigh-in only`
      : `Gained ${["u4", "u2"].map(lg).join("")}${lg("rs")}${["g2", "g4"].map(lg).join("")} Lost &nbsp;·&nbsp; vs previous log`;
}

function renderDay() {
  const box = $("#dy"),
    e = D.find((x) => x.d === sel),
    j = D.indexOf(e),
    title = `${wd(sel)}, ${br(sel)}`;
  if (!e) {
    const r = ob(sel);
    box.innerHTML = `<div class="dp"><div class="hd"><h2>${title}</h2><button class="bt s" data-a="new">Log this day</button></div><small>Nothing logged${r ? " · last known weight " + f1(r.w) + " kg on " + br(r.d) : ""}</small></div>`;
    return;
  }
  const pr = D[j - 1],
    q = pr ? r1(e.w - pr.w) : 0,
    T = [];
  if (sess(e)) {
    if (e.t) T.push(["Time", mmss(e.t)]);
    if (e.k != null) T.push(["Distance", e.k.toFixed(2) + " km"]);
    if (e.s != null) T.push(["Speed", e.s + " km/h"]);
    if (e.i != null) T.push(["Incline", e.i]);
    if (e.c != null) T.push(["Calories", e.c + " kcal"]);
    if (e.t && e.k) T.push(["Pace", mmss(Math.round(e.t / e.k)) + " /km"]);
    if (e.c && e.k) T.push(["Burn rate", Math.round(e.c / e.k) + " kcal/km"]);
  }
  let km = 0,
    kc = 0,
    n = 0;
  D.slice(0, j + 1).forEach((x) => {
    km += x.k || 0;
    kc += x.c || 0;
    n += sess(x) ? 1 : 0;
  });
  box.innerHTML = `<div class="dp"><div class="hd"><h2>${title} <small>${sess(e) ? "· session" : "· rest day"}</small></h2><div class="hb"><button class="bt s" data-a="edit">Edit</button><button class="bt s" data-a="del">Delete</button></div></div>
<div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap"><b style="font-size:40px">${f1(e.w)}<small> kg</small></b><span class="${cl(q)}">${pr ? dv(q) + " kg vs previous log" : "First log"}</span></div>
${T.length ? `<div class="tl">${T.map((x) => `<div><span class="lb">${x[0]}</span><b>${x[1]}</b></div>`).join("")}</div>` : '<small style="display:block;margin:10px 0">Rest day, weigh-in only</small>'}
<small>Day ${diff(sel, D[0].d) + 1} of the journey · ${sg(r1(e.w - D[0].w))} kg since start · ${km.toFixed(1)} km and ${Math.round(kc)} kcal so far · ${n} sessions</small></div>`;
  const db = box.querySelector('[data-a="del"]');
  arm(db, () => {
    D = D.filter((x) => x.d !== sel);
    save();
    render();
    toast("Entry deleted");
  });
}

function renderBars() {
  const wsd = ad(today(), -pd(today()).getDay()),
    V = [],
    U = { k: "km", c: "kcal", t: "min", n: "sessions" };
  for (let w = 11; w >= 0; w--) {
    const a = ad(wsd, -7 * w),
      b = ad(a, 7);
    V.push([
      a,
      D.filter((e) => e.d >= a && e.d < b && sess(e)).reduce(
        (s, e) =>
          s +
          (metric === "n"
            ? 1
            : metric === "t"
              ? (e.t || 0) / 60
              : e[metric] || 0),
        0,
      ),
    ]);
  }
  const mx = Math.max(1, ...V.map((v) => v[1])),
    fm = (v) => (metric === "k" ? v.toFixed(1) : Math.round(v));
  $("#bs2").innerHTML = V.map(
    (v, i) =>
      `<div class="bc"><span class="bv">${v[1] ? fm(v[1]) : ""}</span><div class="br${i == 11 ? " cu" : ""}" style="--h:${((v[1] / mx) * 100).toFixed(1)};--i:${i}"></div><small>${br2(v[0])}</small></div>`,
  ).join("");
  $("#bn").textContent =
    `This week ${fm(V[11][1])} ${U[metric]} · last week ${fm(V[10][1])} ${U[metric]}`;
}

function renderStats() {
  const A = D.filter(sess),
    S = new Set(A.map((e) => e.d));
  let cur = 0,
    d = S.has(today()) ? today() : ad(today(), -1);
  while (S.has(d)) {
    cur++;
    d = ad(d, -1);
  }
  let best = 0,
    run = 0,
    pv = null;
  [...S].sort().forEach((x) => {
    run = pv && ad(pv, 1) === x ? run + 1 : 1;
    best = Math.max(best, run);
    pv = x;
  });
  const km = A.reduce((s, e) => s + (e.k || 0), 0),
    kc = A.reduce((s, e) => s + (e.c || 0), 0),
    mn = A.reduce((s, e) => s + (e.t || 0), 0) / 60;
  const bk = A.reduce((m, e) => ((e.k || 0) > ((m && m.k) || 0) ? e : m), null),
    bs = A.reduce((m, e) => ((e.s || 0) > ((m && m.s) || 0) ? e : m), null);
  const T = [
    ["Sessions", A.length],
    ["Current streak", cur + " d"],
    ["Best streak", best + " d"],
    ["Distance", km.toFixed(1) + " km"],
    ["Calories", Math.round(kc) + " kcal"],
    ["Fat equivalent", (kc / 7700).toFixed(2) + " kg"],
    ["Longest run", bk && bk.k ? bk.k.toFixed(2) + " km" : "—"],
    ["Top speed", bs && bs.s ? bs.s + " km/h" : "—"],
    ["Avg pace", km && mn ? mmss(Math.round((mn * 60) / km)) + " /km" : "—"],
  ];
  $("#st").innerHTML = T.map(
    (x) => `<div><span class="lb">${x[0]}</span><b>${x[1]}</b></div>`,
  ).join("");
}

function openForm(e, d) {
  const x = e || {};
  $("#fd").value = br(e ? e.d : d || today());
  $("#fw").value = x.w ?? "";
  $("#ft").value = x.t ? mmss(x.t) : "";
  $("#fc").value = x.c ?? "";
  $("#fk").value = x.k ?? "";
  $("#fs").value = x.s ?? "";
  $("#fi").value = x.i ?? "";
  $("#er").textContent = "";
  op("#fm", 1);
  setTimeout(() => $("#ft").focus(), 250);
}

function submit() {
  const er = (m) => {
      $("#er").textContent = m;
    },
    m = $("#fd")
      .value.trim()
      .match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
  let d = null;
  if (m) {
    const s =
      (m[3] || new Date().getFullYear()) + "-" + p(m[2]) + "-" + p(m[1]);
    if (iso(pd(s)) === s) d = s;
  }
  if (!d) return er("Date must look like 25/12/2026");
  if (d > today()) return er("That date is in the future");
  const w = num($("#fw").value);
  if (w === null || w < 20 || w > 400)
    return er("Enter the weight, like 120.2");
  const tv = $("#ft").value.trim(),
    tm = tv.match(/^(\d+)(?::([0-5]?\d))?$/);
  if (tv && !tm) return er("Time must look like 29:00");
  const t = tm ? +tm[1] * 60 + (+tm[2] || 0) : null,
    c = num($("#fc").value),
    k = num($("#fk").value),
    i = num($("#fi").value);
  let s = num($("#fs").value);
  if (s === null && t && k) s = +(k / (t / 3600)).toFixed(1);
  const prevIdx = D.filter((x) => x.d < d).length - 1,
    pr = prevIdx >= 0 ? D.filter((x) => x.d < d)[prevIdx] : null;
  D = D.filter((x) => x.d !== d);
  D.push(norm({ d, w, t: t || null, c, k, s, i }));
  save();
  op("#fm", 0);
  sel = d;
  render();
  toast(
    pr ? `Saved · ${sg(r1(w - pr.w))} kg vs previous log` : "Saved · first log",
  );
}

function demo() {
  const out = [];
  let w = 124.6;
  for (let n = 119; n >= 0; n--) {
    w += -0.05 + (Math.random() - 0.5) * 0.5;
    const e = { d: ad(today(), -n), w: +w.toFixed(1) };
    if (Math.random() < 0.62) {
      const m = 20 + Math.floor(Math.random() * 20),
        s = +(5 + Math.random() * 1.5).toFixed(1),
        k = +((s * m) / 60).toFixed(2);
      Object.assign(e, {
        t: m * 60 + Math.floor(Math.random() * 60),
        k,
        s,
        c: +(k * 46 + Math.random() * 10).toFixed(1),
        i: Math.floor(Math.random() * 3),
      });
    }
    out.push(norm(e));
  }
  return out;
}

const tabs = (id, fn) =>
  ($(id).onclick = (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    [...$(id).children].forEach((x) => x.classList.toggle("on", x === b));
    fn(b.dataset);
  });
tabs("#rg", (d) => {
  range = +d.r;
  renderChart();
});
tabs("#hmode", (d) => {
  hmode = d.m;
  renderHeat();
});
tabs("#mt", (d) => {
  metric = d.k;
  renderBars();
});
$("#hm").onclick = (e) => {
  const c = e.target.closest(".ce");
  if (!c) return;
  sel = c.dataset.d;
  $("#hm")
    .querySelectorAll(".sl")
    .forEach((x) => x.classList.remove("sl"));
  c.classList.add("sl");
  renderDay();
};
$("#dy").onclick = (e) => {
  const b = e.target.closest("[data-a]");
  if (!b) return;
  if (b.dataset.a === "new") openForm(null, sel);
  if (b.dataset.a === "edit") openForm(D.find((x) => x.d === sel));
};
$("#bl").onclick = () => openForm(null, today());
$("#fx").onclick = () => op("#fm", 0);
$("#fz").onclick = submit;
$("#fm").onkeydown = (e) => {
  if (e.key === "Enter") submit();
};
$("#fd").oninput = (e) => {
  let v = e.target.value.replace(/\D/g, "").slice(0, 8);
  if (v.length > 4) v = v.slice(0, 2) + "/" + v.slice(2, 4) + "/" + v.slice(4);
  else if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2);
  e.target.value = v;
};
$("#ft").oninput = (e) => {
  e.target.value = e.target.value.replace(/[^\d:]/g, "");
};
$("#gb").onclick = () => {
  const v = num($("#gv").value);
  if (v > 20 && v < 400) {
    goal = v;
    save();
    $("#gv").value = "";
    renderHero();
    renderChart();
  }
};
$("#bd").onclick = () => {
  $("#dt").value = JSON.stringify(D);
  op("#dm", 1);
};
$("#dz").onclick = () => op("#dm", 0);
$("#dc").onclick = async () => {
  const v = $("#dt").value;
  try {
    await navigator.clipboard.writeText(v);
  } catch (e) {
    $("#dt").select();
    document.execCommand("copy");
  }
  toast("Copied");
};
$("#di").onclick = () => {
  try {
    const a = JSON.parse($("#dt").value);
    if (
      !Array.isArray(a) ||
      !a.every((e) => /^\d{4}-\d\d-\d\d$/.test(e.d) && e.w > 0)
    )
      throw 0;
    D = a.map(norm);
    save();
    op("#dm", 0);
    sel = null;
    render();
    toast("Imported " + D.length + " days");
  } catch (e) {
    toast("That does not look like a valid backup");
  }
};
arm($("#dd"), () => {
  D = demo();
  goal = goal || 116;
  save();
  op("#dm", 0);
  sel = null;
  render();
});
arm($("#dx"), () => {
  D = [];
  goal = null;
  save();
  op("#dm", 0);
  sel = null;
  shown = 0;
  render();
});
["#fm", "#dm"].forEach(
  (id) =>
    ($(id).onclick = (e) => {
      if (e.target === e.currentTarget) op(id, 0);
    }),
);
document.onkeydown = (e) => {
  if (e.key === "Escape") {
    op("#fm", 0);
    op("#dm", 0);
  }
};
let rz;
window.onresize = () => {
  clearTimeout(rz);
  rz = setTimeout(renderChart, 150);
};
render();
