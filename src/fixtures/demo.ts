import { type Cell, type RawWorkbook, TABS } from "@/lib/schema";

// Fictional class used when SHEET_ID isn't set (demo mode). Every name is made up.
// Sized like a real class so the dashboards can be reviewed before the Sheet is connected.

const kids = [
  ["Valentina", "Ruiz", "Carla", "Pedro"],
  ["Mateo", "Gómez", "Ana", "Luis"],
  ["Sofía", "Martínez", "Lucía", "Jorge"],
  ["Diego", "López", "Marta", "Andrés"],
  ["Isabella", "Torres", "Paula", "Raúl"],
  ["Santiago", "Vega", "Elena", "Tomás"],
  ["Camila", "Rojas", "Inés", "Felipe"],
  ["Sebastián", "Castro", "Daniela", "Martín"],
  ["Emilia", "Navarro", "Gabriela", "Hugo"],
  ["Nicolás", "Herrera", "Verónica", "Óscar"],
  ["Martina", "Paredes", "Silvia", "Iván"],
  ["Joaquín", "Molina", "Rocío", "Esteban"],
  ["Renata", "Salazar", "Beatriz", "Fernando"],
  ["Benjamín", "Cordero", "Patricia", "Gustavo"],
  ["Antonella", "Ortega", "Natalia", "Rodrigo"],
  ["Lucas", "Mendoza", "Carolina", "Álvaro"],
  ["Julieta", "Ibarra", "Mónica", "Ricardo"],
  ["Emiliano", "Flores", "Adriana", "Sergio"],
  ["Victoria", "Cevallos", "Lorena", "Pablo"],
  ["Gael", "Andrade", "Jimena", "Diego"],
];

const sid = (i: number) => `S${String(i + 1).padStart(2, "0")}`;

const roster: Cell[][] = kids.map(([first, last, mom, dad], i) => [
  sid(i),
  `${first} ${last}`,
  `${mom} ${last}`,
  `+593 99 ${String(1000000 + i * 7919).slice(-7)}`,
  `${mom.toLowerCase()}.${last.toLowerCase()}@example.com`,
  `${dad} ${last}`,
  "",
  "",
  "",
  true,
]);

let n = 0;
const txn = (...cols: Cell[]): Cell[] => [`T${String(++n).padStart(4, "0")}`, ...cols];
const ledger: Cell[][] = [];

// Class fund: $40 per student. 15 paid, S16 partial, S17–S19 unpaid, S20 waived.
for (let i = 0; i < 15; i++)
  ledger.push(txn(`2026-09-${String(8 + (i % 12)).padStart(2, "0")}`, "CLASS-1", "contribution", 40, sid(i), "", "", i % 2 ? "zelle" : "venmo", "", "", "", "", ""));
ledger.push(txn("2026-09-20", "CLASS-1", "contribution", 20, "S16", "", "", "cash", "", "", "", "Pagará el resto en octubre", ""));

ledger.push(txn("2026-09-06", "CLASS-1", "expense", 17.83, "", "Farmacia Uni Plaza", "treasurer", "card", "", "demo-sunblock", "Protector solar", "", ""));
ledger.push(txn("2026-09-06", "CLASS-1", "expense", 26.99, "", "Marathon", "treasurer", "card", "", "demo-ball", "Balón de fútbol", "", ""));
ledger.push(txn("2026-09-25", "CLASS-1", "expense", 42.5, "", "Papelería Cervantes", "Paula Torres", "card", "", "demo-art", "Materiales de arte", "", ""));
ledger.push(txn("2026-10-02", "CLASS-1", "expense", 31.2, "", "Supermaxi", "Elena Vega", "card", "", "demo-snacks", "Refrigerios día del niño", "", ""));
const snacks = `T${String(n).padStart(4, "0")}`;
ledger.push(txn("2026-10-04", "CLASS-1", "reimburse_parent", 31.2, "", "Elena Vega", "", "zelle", "", "", "", "", snacks));

// Closed outing: pumpkin patch; its $12 leftover stays as its balance.
const pumpkin = ["S01", "S02", "S03", "S05", "S07", "S09", "S11", "S13"];
for (const s of pumpkin)
  ledger.push(txn("2026-09-15", "EV-2026-09-HUERTO", "contribution", 15, s, "", "", "venmo", "", "", "", "", ""));
ledger.push(txn("2026-09-27", "EV-2026-09-HUERTO", "expense", 108, "", "Granja El Paraíso", "treasurer", "card", "", "demo-huerto", "Entradas huerto", "", ""));

// Open outing with per-family amounts: kid $20, sibling $20, adult $15.
const flip: [string, number, string][] = [
  ["S01", 35, "1 niño + 1 adulto"],
  ["S02", 55, "1 niño + 1 hermano + 1 adulto"],
  ["S03", 20, "1 niño"],
  ["S04", 35, "1 niño + 1 adulto"],
  ["S05", 50, "1 niño + 2 adultos"],
  ["S06", 20, "1 niño"],
  ["S07", 35, "1 niño + 1 adulto"],
  ["S08", 20, "1 niño"],
  ["S09", 55, "1 niño + 1 hermana + 1 adulto"],
  ["S10", 35, "1 niño + 1 adulto"],
  ["S11", 20, "1 niño"],
  ["S12", 35, "1 niño + 1 adulto"],
  ["S14", 20, "1 niño"],
  ["S15", 75, "1 niño + 2 hermanos + 1 adulto"],
  ["S18", 35, "1 niño + 1 adulto"],
];
flip.slice(0, 9).forEach(([s, amt], i) =>
  ledger.push(txn(`2026-10-0${1 + (i % 7)}`, "EV-2026-10-FLIP-ZONE", "contribution", amt, s, "", "", "venmo", "", "", "", "", "")),
);
ledger.push(txn("2026-10-05", "EV-2026-10-FLIP-ZONE", "contribution", 20, "S10", "", "", "cash", "", "", "", "", ""));
ledger.push(txn("2026-10-07", "EV-2026-10-FLIP-ZONE", "expense", 100, "", "Flip Zone", "Silvana Mendoza", "other", "", "demo-deposit", "Depósito reserva local", "", ""));

const flipTotal = flip.reduce((a, [, amt]) => a + amt, 0);

export const demoWorkbook: RawWorkbook = {
  Roster: [[...TABS.Roster], ...roster],
  Funds: [
    [...TABS.Funds],
    ["CLASS-1", "Fondo de clase 2026-27", "class", 40, "", "", "collecting", "Protector solar, balones, materiales y refrigerios compartidos durante el año."],
    ["EV-2026-09-HUERTO", "Huerto de calabazas", "event", "", 120, "2026-09-27", "closed", "Entrada $13.50 por niño + 10%. 8 niños."],
    ["EV-2026-10-FLIP-ZONE", "Paseo 1 - Flip Zone", "event", "", flipTotal, "2026-10-18", "collecting", `Niño o hermano $20, adulto $15 (entrada + medias antideslizantes, incl. 10%). Total $${flipTotal}.`],
  ],
  Participants: [
    [...TABS.Participants],
    ...pumpkin.map((s) => ["EV-2026-09-HUERTO", s, 15, "1 niño"]),
    ...flip.map(([s, amt, who]) => ["EV-2026-10-FLIP-ZONE", s, amt, who]),
    ["CLASS-1", "S20", 0, ""],
  ],
  Ledger: [[...TABS.Ledger], ...ledger],
  Config: [
    [...TABS.Config],
    ["schema_version", "3"],
    ["school_year", "2026-27"],
    ["directiva_email", "demo@example.com"],
  ],
};
