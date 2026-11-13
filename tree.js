// The Tree of Knowledge: one fruit per build, lowest branch to the crown.
// When a build is posted, set its status ("ripe" | "ripening" | "bud"), and add
// its link, quote, theme (kind) or date. Leave a field out and it is not shown.
const FRUITS = [
 {
  "n": 1,
  "name": "Build 1",
  "kind": "Individual",
  "status": "ripe",
  "note": "Written individually. On the site so far: Sasha, Ollie, Will, Daisy.",
  "link": "team.html",
  "linkText": "Find it on the Paths →"
 },
 {
  "n": 2,
  "name": "Build 2",
  "kind": "Team essay · Paradise Lost & Westworld",
  "status": "ripe",
  "quote": "“Consciousness, in both cases, may illuminate the cage without unlocking it.”",
  "link": "build-2.html",
  "linkText": "Taste this fruit →"
 },
 {
  "n": 3,
  "name": "Build 3",
  "kind": "Individual",
  "status": "ripe",
  "note": "Written individually. On the site so far: Ollie, Rhea, Will, Daisy.",
  "link": "team.html",
  "linkText": "Find it on the Paths →"
 },
 {
  "n": 4,
  "name": "Build 4",
  "kind": "Individual",
  "status": "ripe",
  "note": "Written individually. On the site so far: Ollie, Rhea, Will, Daisy.",
  "link": "team.html",
  "linkText": "Find it on the Paths →"
 },
 {
  "n": 5,
  "name": "Build 5",
  "kind": "Individual",
  "status": "ripe",
  "note": "Written individually. On the site so far: Ollie, Rhea, Will, Daisy.",
  "link": "team.html",
  "linkText": "Find it on the Paths →"
 },
 {
  "n": 6,
  "name": "Build 6",
  "kind": "Team",
  "status": "bud",
  "note": "Not yet grown."
 },
 {
  "n": 7,
  "name": "Build 7",
  "kind": "Individual",
  "status": "bud",
  "note": "Not yet grown."
 },
 {
  "n": 0,
  "name": "The Crown",
  "kind": "The final build",
  "status": "bud",
  "note": "The top of the tree. Not yet reached."
 }
];
const LABELS = { ripe: "Ripe", ripening: "Ripening", bud: "Not yet grown" };
(function () {
  const $ = id => document.getElementById(id);
  function set(id, text) { const el = $(id); el.textContent = text || ""; el.hidden = !text; }
  function show(n) {
    const f = FRUITS.find(x => x.n === n);
    if (!f) return;
    set("fi-no", f.n ? "Fruit 0" + f.n : "The top of the tree");
    set("fi-name", f.name);
    set("fi-kind", f.kind);
    set("fi-quote", f.quote);
    set("fi-note", f.note);
    set("fi-date", f.date);
    const b = $("fi-badge"); b.textContent = LABELS[f.status]; b.className = "badge " + f.status;
    const a = $("fi-link"); a.hidden = !f.link; if (f.link) { a.href = f.link; a.textContent = f.linkText || "Taste this fruit →"; }
    document.querySelectorAll(".fruit").forEach(g => {
      const on = Number(g.dataset.fruit) === n;
      g.classList.toggle("on", on); g.setAttribute("aria-pressed", on);
    });
    const card = document.querySelector(".fruit-info");
    if (card && card.animate && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      card.querySelectorAll(":scope > *:not([hidden])").forEach((el, i) =>
        el.animate([{ transform: "translateY(14px)", clipPath: "inset(0 0 100% 0)" }, { transform: "none", clipPath: "inset(0 0 -20% 0)" }],
          { duration: 520, delay: i * 45, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }));
    }
  }
  document.querySelectorAll(".fruit").forEach(g => {
    const n = Number(g.dataset.fruit);
    g.addEventListener("click", () => show(n));
    g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); show(n); } });
  });
})();
