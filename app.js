const $ = id => document.getElementById(id);
let DECKS = new Map(); // deck name -> [[front, back], ...]

const DELIMS = ["\t", "::", "|", ";"];
function splitCard(line) {
  for (const d of DELIMS) {
    const i = line.indexOf(d);
    if (i > 0) return [line.slice(0, i).trim(), line.slice(i + d.length).trim()];
  }
  return null;
}
function parse(text, defaultDeck) {
  let deck = defaultDeck;
  for (const raw of text.replace(/\r/g, "").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#")) { deck = line.replace(/^#+\s*/, "").replace(/\s*\/\s*/g, "::") || defaultDeck; continue; }
    const c = splitCard(line);
    if (!c || !c[0] || !c[1]) continue;
    if (!DECKS.has(deck)) DECKS.set(deck, []);
    DECKS.get(deck).push(c);
  }
}

$("open").onclick = () => { const u = $("link").value.trim(); if (u) window.open(u, "_blank", "noopener"); };

$("convert").onclick = async () => {
  DECKS = new Map();
  const root = $("root").value.trim();
  parse($("text").value, "Gizmo import");
  for (const f of $("files").files) parse(await f.text(), f.name.replace(/\.[^.]+$/, ""));
  if (root) DECKS = new Map([...DECKS].map(([k, v]) => [root + "::" + k, v]));
  const box = $("decks"); box.innerHTML = "";
  let total = 0;
  for (const [name, cards] of DECKS) {
    total += cards.length;
    const d = document.createElement("div"); d.className = "deck";
    d.innerHTML = "<span></span><b>" + cards.length + " cards</b>";
    d.firstChild.textContent = name; box.appendChild(d);
  }
  $("result").hidden = false;
  $("status").textContent = total ? "" : "No cards found. Check the separators.";
};

function download(blob, name) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
$("apkg").onclick = async () => {
  if (![...DECKS.values()].some(c => c.length)) return;
  $("status").textContent = "Building…";
  try { download(await buildApkg(DECKS), "gizmo-anki.apkg"); $("status").textContent = "Done. Open the file with Anki (File → Import)."; }
  catch (e) { console.error(e); $("status").textContent = "Error: " + e.message; }
};
$("csv").onclick = () => {
  const q = s => '"' + s.replace(/"/g, '""') + '"';
  const rows = [];
  for (const [d, cards] of DECKS) for (const [f, b] of cards) rows.push([q(f), q(b), q(d)].join(","));
  download(new Blob(["\ufeff" + rows.join("\n")], { type: "text/csv" }), "gizmo-anki.csv");
};
