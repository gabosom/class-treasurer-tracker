import { type RawWorkbook, TABS } from "@/lib/schema";

// Small fictional workbook for unit tests (demo mode uses fixtures/demo.ts).
// Covers: class fund, a paid-by-another-parent expense with partial payback,
// an event with a refund, a closed event with its leftover moved to EVENTS-POOL.

export const sampleWorkbook: RawWorkbook = {
  Roster: [
    [...TABS.Roster],
    ["S01", "Valentina Ruiz", "Carla Ruiz", "+1 415 555 0101", "carla@example.com", "Pedro Ruiz", "", "", "@carla-ruiz", true],
    ["S02", "Mateo Gómez", "Ana Gómez", "+1 415 555 0102", "ana@example.com", "Luis Gómez", "+1 415 555 0112", "", "", true],
    ["S03", "Sofía Martínez", "Lucía Martínez", "", "", "Jorge Martínez", "", "", "", true],
    ["S04", "Diego López", "Marta López", "", "", "", "", "", "", true],
    ["S05", "Emma Silva", "Rosa Silva", "", "", "", "", "", "", false],
  ],
  Funds: [
    [...TABS.Funds],
    ["CLASS-1", "Fondo de clase 2026-27", "class", 40, "", "", "collecting", "Útiles y materiales compartidos para todo el año."],
    ["EVENTS-POOL", "Fondo de eventos", "events_pool", "", "", "", "collecting", "Sobrantes de eventos; solo se usan para otros eventos."],
    ["EV-2026-10-PUMPKIN", "Huerto de calabazas", "event", "", 40, "2026-10-20", "closed", "Entradas 3×$12 = $36 + 10% ≈ $40."],
    ["EV-2026-11-ZOO", "Zoológico", "event", "", 90, "2026-11-14", "collecting", "Niño o adulto $15 c/u (bus + entrada, incl. 10%). Total $90."],
  ],
  Participants: [
    [...TABS.Participants],
    ["EV-2026-10-PUMPKIN", "S01", 15, "1 niño"],
    ["EV-2026-10-PUMPKIN", "S02", 15, "1 niño"],
    ["EV-2026-10-PUMPKIN", "S03", 15, "1 niño"],
    ["EV-2026-11-ZOO", "S01", 30, "1 niño + 1 adulto"],
    ["EV-2026-11-ZOO", "S02", 45, "1 niño + 1 hermano + 1 adulto"],
    ["EV-2026-11-ZOO", "S04", 15, "1 niño"],
    ["CLASS-1", "S04", 0, ""], // waiver
  ],
  Ledger: [
    [...TABS.Ledger],
    ["T0001", "2026-10-01", "CLASS-1", "contribution", 40, "S01", "", "", "venmo", "VNM-1", "", "", "", ""],
    ["T0002", "2026-10-01", "CLASS-1", "contribution", 40, "S02", "", "", "zelle", "", "", "", "", ""],
    ["T0003", "2026-10-02", "CLASS-1", "contribution", 20, "S03", "", "", "cash", "", "", "", "", ""],
    ["T0004", "2026-10-02", "CLASS-1", "expense", 23.47, "", "Costco", "treasurer", "card", "", "file-sunblock", "Protector solar", "", ""],
    ["T0005", "2026-10-05", "CLASS-1", "expense", 18.99, "", "Target", "Ana Gómez", "card", "", "file-ball", "Balón de fútbol", "", ""],
    ["T0006", "2026-10-06", "CLASS-1", "expense", 30, "", "Michaels", "Lucía Martínez", "card", "", "", "Materiales de arte", "", ""],
    ["T0007", "2026-10-07", "CLASS-1", "reimburse_parent", 30, "", "Lucía Martínez", "", "zelle", "", "", "", "", "T0006"],
    ["T0008", "2026-10-10", "EV-2026-10-PUMPKIN", "contribution", 15, "S01", "", "", "venmo", "", "", "", "", ""],
    ["T0009", "2026-10-10", "EV-2026-10-PUMPKIN", "contribution", 15, "S02", "", "", "venmo", "", "", "", "", ""],
    ["T0010", "2026-10-11", "EV-2026-10-PUMPKIN", "contribution", 15, "S03", "", "", "cash", "", "", "", "", ""],
    ["T0011", "2026-10-20", "EV-2026-10-PUMPKIN", "expense", 36, "", "Granja Feliz", "treasurer", "card", "", "file-pumpkin", "Entradas huerto", "", ""],
    ["T0012", "2026-10-21", "EV-2026-10-PUMPKIN", "transfer_out", 9, "", "", "", "other", "", "", "", "pair T0013", ""],
    ["T0013", "2026-10-21", "EVENTS-POOL", "transfer_in", 9, "", "", "", "other", "", "", "", "pair T0012", ""],
    ["T0014", "2026-10-25", "EV-2026-11-ZOO", "contribution", 30, "S01", "", "", "venmo", "", "", "", "", ""],
    ["T0015", "2026-10-25", "EV-2026-11-ZOO", "contribution", 30, "S02", "", "", "venmo", "", "", "", "", ""],
    ["T0016", "2026-10-26", "EV-2026-11-ZOO", "contribution", 25, "S03", "", "", "venmo", "", "", "", "", ""],
    ["T0017", "2026-10-28", "EV-2026-11-ZOO", "refund_family", 25, "S03", "", "", "venmo", "", "", "", "Se dio de baja", ""],
  ],
  Config: [
    [...TABS.Config],
    ["schema_version", "2"],
    ["school_year", "2026-27"],
    ["directiva_email", "gabosom@gmail.com"],
    ["receipts_folder_id", "1gpNShYJEYMFFUltJQx4m1MIOW-geVyAp"],
  ],
};
