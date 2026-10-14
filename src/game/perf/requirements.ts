/** Art that a starting weapon or an early level-up choice can make visible immediately. */
export interface ArtRequirement {
  clips: readonly (readonly [string, number])[];
  sprites: readonly string[];
}
export const SKILL_ART: Record<string, ArtRequirement> = {
  bite: { clips: [["arc", 230]], sprites: ["fx-jab"] },
  spit: { clips: [["flask", 220]], sprites: ["proj-flask", "fx-fire"] },
  stomp: { clips: [["slam", 240]], sprites: ["fx-slam"] },
  meteor: {
    clips: [["meteor", 220]],
    sprites: ["proj-meteor", "proj-rock", "fx-fire"],
  },
  thorns: { clips: [["dog", 160]], sprites: [] },
  orbit: { clips: [], sprites: ["proj-lid"] },
  boomerang: { clips: [], sprites: ["proj-bone"] },
  roar: { clips: [], sprites: ["fx-horn"] },
};
