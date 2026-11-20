// Builds an Anki .apkg (legacy schema 11, Basic note type) fully in the browser.
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");

async function sha1int(s) {
  const h = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(s));
  return parseInt([...new Uint8Array(h).slice(0, 4)].map(b => b.toString(16).padStart(2, "0")).join(""), 16);
}
function guid() {
  const c = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&()*+,-./:;<=>?@[]^_`{|}~";
  return Array.from(crypto.getRandomValues(new Uint8Array(10)), x => c[x % c.length]).join("");
}

async function buildApkg(decks) {
  const SQL = await initSqlJs({ locateFile: f => "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/" + f });
  const db = new SQL.Database();
  const now = Math.floor(Date.now() / 1000), nowMs = Date.now();
  const MID = 1607392319000;
  db.run(`CREATE TABLE col(id integer primary key,crt integer not null,mod integer not null,scm integer not null,ver integer not null,dty integer not null,usn integer not null,ls integer not null,conf text not null,models text not null,decks text not null,dconf text not null,tags text not null);
CREATE TABLE notes(id integer primary key,guid text not null,mid integer not null,mod integer not null,usn integer not null,tags text not null,flds text not null,sfld integer not null,csum integer not null,flags integer not null,data text not null);
CREATE TABLE cards(id integer primary key,nid integer not null,did integer not null,ord integer not null,mod integer not null,usn integer not null,type integer not null,queue integer not null,due integer not null,ivl integer not null,factor integer not null,reps integer not null,lapses integer not null,left integer not null,odue integer not null,odid integer not null,flags integer not null,data text not null);
CREATE TABLE revlog(id integer primary key,cid integer not null,usn integer not null,ease integer not null,ivl integer not null,lastIvl integer not null,factor integer not null,time integer not null,type integer not null);
CREATE TABLE graves(usn integer not null,oid integer not null,type integer not null);
CREATE INDEX ix_notes_usn on notes(usn);CREATE INDEX ix_cards_usn on cards(usn);CREATE INDEX ix_cards_nid on cards(nid);CREATE INDEX ix_cards_sched on cards(did,queue,due);CREATE INDEX ix_notes_csum on notes(csum);`);

  const model = { [MID]: { id: MID, name: "Basic (Gizmo)", type: 0, mod: now, usn: -1, sortf: 0, did: 1, latexPre: "", latexPost: "", tags: [], vers: [], req: [[0, "all", [0]]],
    css: ".card{font-family:arial;font-size:20px;text-align:center;color:#000;background:#fff}",
    flds: ["Front", "Back"].map((n, i) => ({ name: n, ord: i, sticky: false, rtl: false, font: "Arial", size: 20, media: [] })),
    tmpls: [{ name: "Card 1", ord: 0, qfmt: "{{Front}}", afmt: "{{FrontSide}}<hr id=answer>{{Back}}", bqfmt: "", bafmt: "", did: null }] } };
  const mkDeck = (id, name) => ({ id, name, mod: now, usn: -1, lrnToday: [0, 0], revToday: [0, 0], newToday: [0, 0], timeToday: [0, 0], collapsed: false, desc: "", dyn: 0, conf: 1, extendNew: 10, extendRev: 50 });
  const deckObj = { 1: mkDeck(1, "Default") };
  const dconf = { 1: { id: 1, name: "Default", mod: 0, usn: 0, maxTaken: 60, autoplay: true, timer: 0, replayq: true,
    new: { bury: true, delays: [1, 10], initialFactor: 2500, ints: [1, 4, 7], order: 1, perDay: 20 },
    rev: { bury: true, ease4: 1.3, ivlFct: 1, maxIvl: 36500, perDay: 200, hardFactor: 1.2 },
    lapse: { delays: [10], leechAction: 0, leechFails: 8, minInt: 1, mult: 0 } } };

  let did = nowMs, nid = nowMs, due = 1;
  const stNote = db.prepare("INSERT INTO notes VALUES(?,?,?,?,?,?,?,?,?,?,?)");
  const stCard = db.prepare("INSERT INTO cards VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
  for (const [name, cards] of decks) {
    if (!cards.length) continue;
    did++; deckObj[did] = mkDeck(did, name);
    for (const [f, b] of cards) {
      nid++;
      const F = esc(f), B = esc(b);
      stNote.run([nid, guid(), MID, now, -1, "", F + "\x1f" + B, F, await sha1int(f), 0, ""]);
      stCard.run([nid, nid, did, 0, now, -1, 0, 0, due++, 0, 0, 0, 0, 0, 0, 0, 0, ""]);
    }
  }
  stNote.free(); stCard.free();
  db.run("INSERT INTO col VALUES(1,?,?,?,11,0,0,0,?,?,?,?,?)", [now, nowMs, nowMs, "{}", JSON.stringify(model), JSON.stringify(deckObj), JSON.stringify(dconf), "{}"]);
  const data = db.export(); db.close();

  const zip = new JSZip();
  zip.file("collection.anki2", data);
  zip.file("media", "{}");
  return zip.generateAsync({ type: "blob" });
}
