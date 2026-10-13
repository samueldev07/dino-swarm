"""
Art v2 prompts (owner 09/10: "nhìn thiếu nhi quá" -> picked direction A,
premium stylized 3D cartoon). Writes art/prompts-v2.csv; generate with

    python tools/build_glab_jobs.py --csv art/prompts-v2.csv --style premium \\
        --style-ref art/style-ref-A.jpg --keys dino-11
    ... then the rest with --anchor dino-11 --raw art/raw-v2

Species and body colours stay the same per tier (TIERS in config.ts uses them
for badges and particles); only the look grows up.
"""
import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

SPRITE = ("full body, three-quarter side view facing right, standing on nothing, centered, "
          "plain flat pure white background, no ground, no shadow, no text")
ICON = "single object game icon, centered, plain flat pure white background, no frame, no border, no shadow, no text"

DINOS = {
    "dino-01": "a young compsognathus-like small theropod dinosaur, lime green scales with a pale green underside, a single leaf-shaped crest on its head, alert curious stance, juvenile but not a baby",
    "dino-02": "a young hypsilophodon dinosaur, mint teal scales with a pale mint underside, two small rounded horn nubs, quick playful stance",
    "dino-03": "a velociraptor dinosaur, sky blue scales with pale blue underside and a crest of short feathers on its head and arms, athletic ready-to-sprint stance, sharp claws",
    "dino-04": "a ceratosaurus-like dinosaur, warm orange scales with a cream underside, a row of dark orange spikes along its back and tail, a small nose horn, confident stance",
    "dino-05": "a parasaurolophus dinosaur, sunny yellow scales with a cream underside, long curved tube crest sweeping back in golden brown, proud upright stance",
    "dino-06": "a stegosaurus dinosaur, lavender purple scales with a pale lilac underside, tall deep purple back plates, four tail spikes, sturdy stance",
    "dino-07": "an ankylosaurus dinosaur, leaf green skin, dark green armoured back covered in cream bony studs, a heavy tail club, low powerful stance",
    "dino-08": "a triceratops dinosaur, tangerine orange skin with a peach underside, large ornate frill, three long ivory horns, determined charging-ready stance",
    "dino-09": "a spinosaurus dinosaur, coral red scales with a pale pink underside, tall striped sail on its back in darker red, long crocodile-like snout, fierce stance",
    "dino-10": "a brachiosaurus dinosaur, royal blue skin with a pale blue underside, long neck raised high, small head, majestic calm stance",
    "dino-11": "a tyrannosaurus rex, crimson red scales with a pinkish underside and dark stripes on its back, massive head with a toothy confident grin, strong legs, heroic powerful stance",
    "dino-12": "a legendary titan dinosaur, glowing cyan scales covered in translucent crystal armour plates, a golden crown of three spikes on its head, faint glowing aura and sparkles, awe-inspiring heroic stance",
}

ENEMY = "a menacing stylized game monster, chunky readable silhouette, glowing eyes, mean but not gory"
ROWS = {
    **{k: f"Stylized 3D cartoon game character: {v}. Friendly-cool, not chibi, not a baby. {SPRITE}" for k, v in DINOS.items()},
    "egg": f"Stylized 3D cartoon dinosaur egg game item, cream shell with soft grey speckles and a subtle crack line, upright, {ICON}",
    "egg-lucky": f"Stylized 3D cartoon golden dinosaur egg game item, polished gold shell with pale speckles and a few sparkles, upright, {ICON}",
    # Green Valley
    "enemy-1": f"Stylized 3D cartoon game monster: a floating rock golem meteor, brown boulder body with moss tufts and glowing orange lava cracks, {ENEMY}, {SPRITE}",
    "enemy-1-2": f"Stylized 3D cartoon game monster: a spiky stone beetle with a mossy rock shell, stubby legs, glowing orange lava cracks, {ENEMY}, {SPRITE}",
    "enemy-1-3": f"Stylized 3D cartoon game monster: a boulder crab with two rocky claws raised, mossy brown rock body, glowing orange lava cracks, {ENEMY}, {SPRITE}",
    "boss-1": f"Stylized 3D cartoon game boss: a huge lava-cracked rock golem with a crown of red crystal spikes, glowing eyes, imposing, {ENEMY}, {SPRITE}",
    # Volcano Lands (art set 2)
    "enemy-2": f"Stylized 3D cartoon game monster: a floating black basalt meteor with blazing lava cracks and small flames, {ENEMY}, {SPRITE}",
    "enemy-2-2": f"Stylized 3D cartoon game monster: a magma slug with a glowing molten body and a black basalt shell, small flames, {ENEMY}, {SPRITE}",
    "enemy-2-3": f"Stylized 3D cartoon game monster: an obsidian rock imp with small stone wings and ember sparks, {ENEMY}, {SPRITE}",
    "boss-2": f"Stylized 3D cartoon game boss: a towering basalt lava titan with blazing cracks and a crown of fiery crystal spikes, {ENEMY}, {SPRITE}",
    # Snowy Peaks (art set 3)
    "enemy-3": f"Stylized 3D cartoon game monster: a floating ice-crusted stone golem with frost crystals and glowing pale blue cracks, {ENEMY}, {SPRITE}",
    "enemy-3-2": f"Stylized 3D cartoon game monster: an ice porcupine golem covered in frost crystal spikes, {ENEMY}, {SPRITE}",
    "enemy-3-3": f"Stylized 3D cartoon game monster: a snow-capped rock golem with two ice horns, {ENEMY}, {SPRITE}",
    "boss-3": f"Stylized 3D cartoon game boss: a giant frost golem of blue-grey stone with a crown of jagged ice spikes and a cold blue glow, {ENEMY}, {SPRITE}",
    # backgrounds: the pen is drawn by the game, keep the middle open
    "bg-landscape-1": "Stylized 3D cartoon prehistoric valley game background, warm late-afternoon light, distant smoking volcano, cliffs with waterfalls and a turquoise river along the horizon at about 35 percent from the top, a wide open flat grassy meadow with a few dirt patches filling the lower 60 percent, jungle framing only the far left and right edges, no characters, no fences, no UI",
    "bg-portrait-1": "Stylized 3D cartoon prehistoric valley game background for a vertical phone screen, warm late-afternoon light, distant smoking volcano, a turquoise river along the horizon at about 25 percent from the top, a wide open flat grassy meadow with dirt patches filling the lower 70 percent, ferns framing only the far edges, no characters, no fences, no UI",
    "bg-landscape-2": "Stylized 3D cartoon prehistoric volcanic ridge game background, orange ember sky, distant active volcanoes and lava rivers along the horizon at about 35 percent from the top, a wide open flat dark rocky plateau with ash patches filling the lower 60 percent, scorched shrubs only at the far edges, no characters, no fences, no UI",
    "bg-portrait-2": "Stylized 3D cartoon prehistoric volcanic ridge game background for a vertical phone screen, orange ember sky, distant volcanoes on the horizon at about 25 percent from the top, a wide open flat dark rocky plateau filling the lower 70 percent, scorched shrubs only at the far edges, no characters, no fences, no UI",
    "bg-landscape-3": "Stylized 3D cartoon prehistoric snowy mountain game background, crisp pale blue sky, jagged icy peaks and a frozen lake along the horizon at about 35 percent from the top, a wide open flat snowy field with trampled snow patches filling the lower 60 percent, snowy pines only at the far edges, no characters, no fences, no UI",
    "bg-portrait-3": "Stylized 3D cartoon prehistoric snowy mountain game background for a vertical phone screen, pale blue sky, icy peaks and a frozen lake on the horizon at about 25 percent from the top, a wide open flat snowy field filling the lower 70 percent, snowy pines only at the far edges, no characters, no fences, no UI",
    # icons in the same material family
    "ui-coin": f"Stylized 3D cartoon gold coin with an embossed dinosaur footprint, polished metal, {ICON}",
    "ui-dex": f"Stylized 3D cartoon leather-bound field journal book with a dinosaur footprint emblem on the cover, {ICON}",
    "ui-gear": f"Stylized 3D cartoon carved stone settings cog, {ICON}",
    "ui-map": f"Stylized 3D cartoon folded parchment treasure map with a dotted red trail and a red X, {ICON}",
    "ui-quest": f"Stylized 3D cartoon rolled parchment scroll tied with a leather cord and a wax seal with a dinosaur footprint, {ICON}",
    "ui-camp": f"Stylized 3D cartoon prehistoric camp: a hide tent on a bone frame with a small campfire and a wooden sign with an up arrow, {ICON}",
    "ui-up-power": f"Stylized 3D cartoon set of three sharp curved dinosaur claws with a hot orange glow, {ICON}",
    "ui-up-vitality": f"Stylized 3D cartoon round shield made of green dinosaur scales with a red heart emblem, {ICON}",
    "ui-up-riches": f"Stylized 3D cartoon straw nest overflowing with gold coins, {ICON}",
    "ui-up-bargain": f"Stylized 3D cartoon speckled dinosaur egg with a red price tag tied on with string, {ICON}",
    "ui-gift": f"Stylized 3D cartoon wrapped gift box with a big red ribbon bow and small gold sparkles, {ICON}",
}

SIZES = {"bg-landscape": "1920x1080", "bg-portrait": "1080x1920"}

out = ROOT / "art" / "prompts-v2.csv"
with open(out, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["key", "priority", "size", "prompt"])
    for k, v in ROWS.items():
        size = next((s for p, s in SIZES.items() if k.startswith(p)), "1024x1024")
        w.writerow([k, "P0", size, v])
print(f"{len(ROWS)} prompts -> {out}")
