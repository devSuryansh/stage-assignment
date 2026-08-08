export type FixtureMeta = {
  id: string;
  title: string;
  blurb: string;
  scenes: number;
  filename: string;
  tags: string[];
};

export const FIXTURES: FixtureMeta[] = [
  {
    id: "jail-5scenes",
    title: "Central Jail · 5 scenes",
    blurb: "Intake, barrack, and the collar-lump joke. The acceptance fixture.",
    scenes: 5,
    filename: "sample-5scenes.txt",
    tags: ["jail", "power", "Bangru demo"],
  },
  {
    id: "sabzi-mandi",
    title: "Sabzi Mandi · 3 scenes",
    blurb: "Morning mandi haggling, a lost child, and a scooter quarrel.",
    scenes: 3,
    filename: "sample-sabzi-mandi.txt",
    tags: ["market", "rural", "comic"],
  },
  {
    id: "bus-adda",
    title: "Bus Adda · 3 scenes",
    blurb: "Ticket window chaos, a late bridegroom, dust and diesel.",
    scenes: 3,
    filename: "sample-bus-adda.txt",
    tags: ["travel", "semi-urban"],
  },
  {
    id: "thana",
    title: "Thana Veranda · 3 scenes",
    blurb: "A stolen buffalo report, tea diplomacy, and a reluctant apology.",
    scenes: 3,
    filename: "sample-thana.txt",
    tags: ["police", "village"],
  },
];

export function getFixture(id: string): FixtureMeta | undefined {
  return FIXTURES.find((f) => f.id === id);
}
