import type { CultureProfile, SettingType } from "../schema";

export function buildBangruProfile(setting: SettingType = "rural"): CultureProfile {
  return {
    dialect: "Bangru",
    region: "Haryana",
    setting,
    verbal: [
      "Bangru Haryanvi dialect with regional rhythm, not generic Hindi polish",
      "Honorifics: bhaiya, kaka, tau, chacha used by rank and age",
      "Kinship framing even among strangers (beta, puttar, bhai)",
      "Blunt humor, teasing, and dry sarcasm under pressure",
      "Code-switching: official jail paperwork Hindi/English vs street Bangru",
      "Idioms around izzat, laaj, dharam, kheti metaphors where natural",
    ],
    nonverbal: [
      "Direct eye contact as challenge; looking down as submission",
      "Palm shove, shoulder push, matching stick rhythm for authority",
      "Sitting cross-legged on floor; raised charpai for power",
      "Silence used as threat more than volume",
      "Greeting with nod or 'Ram Ram' among elders; none for convicts",
    ],
    wardrobe: [
      "Khaki police kurta-pyjama / shirt with brass buttons for havaldar",
      "Coarse grey jail uniform, stamped number placard",
      "Older inmates: torn vest, gamcha, rubber chappals",
      "Power inmate: open shirt, matchstick, tin trunk near bedroll",
      "Clerk: faded white shirt, steel watch, ledger ink stains",
    ],
    architecture: [
      "Bone-coloured plaster walls, rusted iron gates, broken glass on walls",
      "Ceiling fans, bare bulbs, barred windows throwing stripe light",
      "Concrete barracks, stinking corner latrine, muster yard dust",
      "Rural Haryana cues: neem shade outside walls, tractor road dust, peepal near compound",
    ],
    food: [
      "Jail mess: watery dal, thick roti, onion, watery chai in steel tumblers",
      "Trusty privileges: extra roti, jaggery, bidis",
    ],
    socialRules: [
      "Barrack hierarchy: who sits raised, who sleeps near latrine",
      "Crime type determines izzat; sexual crimes mark someone as below the rest",
      "Elders (kaka) can show mercy without losing face",
      "Guards speak down; convicts do not answer back",
    ],
    humor: [
      "Mockery of the newcomer as entertainment",
      "Wordplay on number-as-name",
      "Laughing at paperwork ritual while enforcing it",
    ],
    adaptationNotes:
      "Rewrite dialogue and action so they feel native to Bangru Haryanvi rural Haryana jail culture. Do not merely transliterate Hindi. Keep story beats, prop transfers, and power dynamics intact. Cultural specifics must be exact Bangru/Haryana, never a generic North Indian mashup.",
  };
}

export const CULTURE_PRESETS = [
  {
    dialect: "Bangru",
    region: "Haryana",
    setting: "rural" as const,
    label: "Bangru Haryanvi (Haryana, rural)",
  },
  {
    dialect: "Bangru",
    region: "Haryana",
    setting: "urban" as const,
    label: "Bangru Haryanvi (Haryana, urban)",
  },
  {
    dialect: "Malwai",
    region: "Malwa, Punjab",
    setting: "rural" as const,
    label: "Malwai Punjabi (Malwa, rural) — bonus",
  },
];
