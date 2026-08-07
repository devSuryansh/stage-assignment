# Continuity Report
Job: d26dc2b4-a854-4f9d-bf61-9b0015386005
Culture: Bangru Haryanvi (Haryana, rural)
Generated: 2026-08-06T18:43:10.956Z

## Issues (12)
- [warning] Important character Havaldar missing after-state in scene 2 (scenes: 2; entities: char_havaldar)
- [warning] Important character Havaldar missing after-state in scene 3 (scenes: 3; entities: char_havaldar)
- [warning] Important character Havaldar missing after-state in scene 4 (scenes: 4; entities: char_havaldar)
- [warning] Important character Dagdu missing after-state in scene 5 (scenes: 5; entities: char_dagdu)
- [warning] Important character Ganpat missing after-state in scene 5 (scenes: 5; entities: char_ganpat)
- [warning] Prop "collar lump sewn in shirt" on char_convict after scene 1 not reflected before scene 2 (scenes: 1, 2; entities: char_convict)
- [warning] Prop "collar lump sewn in shirt" on char_convict after scene 2 not reflected before scene 3 (scenes: 2, 3; entities: char_convict)
- [warning] Prop "hidden collar lump (on body)" on char_convict after scene 3 not reflected before scene 4 (scenes: 3, 4; entities: char_convict)
- [warning] Prop "grey uniform" on char_convict after scene 3 not reflected before scene 4 (scenes: 3, 4; entities: char_convict)
- [warning] Prop "hidden collar lump (on body)" on char_convict after scene 4 not reflected before scene 5 (scenes: 4, 5; entities: char_convict)
- [warning] Prop "number placard 613" on char_convict after scene 4 not reflected before scene 5 (scenes: 4, 5; entities: char_convict)
- [warning] Prop "grey uniform" on char_convict after scene 4 not reflected before scene 5 (scenes: 4, 5; entities: char_convict)

## Scene continuity
### Scene 1
- char_convict: wearing=[civilian clothes] carrying=[civilian clothes; collar lump sewn in shirt] gained=[] lost=[] injuries=[half-healed cut over eye]
### Scene 2
- char_convict: wearing=[civilian clothes] carrying=[civilian clothes; collar lump sewn in shirt] gained=[number identity 613] lost=[] injuries=[half-healed cut over eye]
### Scene 3
- char_convict: wearing=[grey jail uniform; 613 placard] carrying=[hidden collar lump (on body); grey uniform] gained=[lump relocated on body] lost=[civilian shirt] injuries=[half-healed cut over eye]
  note: Critical continuity: lump moves from collar to body before uniform on
### Scene 4
- char_convict: wearing=[grey jail uniform; 613 placard] carrying=[hidden collar lump (on body); number placard 613; grey uniform] gained=[] lost=[] injuries=[half-healed cut over eye]
### Scene 5
- char_convict: wearing=[grey jail uniform; 613 placard] carrying=[hidden collar lump (on body); number placard 613; grey uniform] gained=[] lost=[] injuries=[half-healed cut over eye]

## Costume reuse
- cos_convict_civilian (Convict civilian intake clothes) → character char_convict; scenes 1, 2; reason=n/a
- cos_convict_uniform (Convict grey jail uniform + 613) → character char_convict; scenes 3, 4, 5; reason=Forced strip and uniform issue at intake
- cos_havaldar_khaki (Havaldar khaki duty kit) → character char_havaldar; scenes 2, 3, 4, 5; reason=n/a
- cos_dagdu_open_shirt (Dagdu open-shirt barrack boss) → character char_dagdu; scenes 5; reason=n/a
- cos_ganpat_elder (Ganpat elder inmate) → character char_ganpat; scenes 5; reason=n/a