// Body type effectiveness chart from the original Pocket Summoner
// weak = types that deal extra damage TO this type
// strong = types this type deals extra damage TO

const TYPE_CHART = {
  Normal:      { weak: [],                        strong: [] },
  Fire:        { weak: ["Water"],                  strong: ["Electricity", "Dark", "Grass"] },
  Water:       { weak: ["Electricity", "Ground"],  strong: ["Fire", "Ground"] },
  Ground:      { weak: ["Poison", "Fire"],         strong: ["Water", "Electricity"] },
  Wind:        { weak: ["Dark"],                   strong: ["Ground"] },
  Grass:       { weak: ["Poison", "Fire"],         strong: ["Water", "Wind"] },
  Poison:      { weak: ["Water", "Wind"],          strong: ["Fire", "Grass"] },
  Dark:        { weak: ["Light"],                  strong: ["Normal"] },
  Light:       { weak: [],                         strong: ["Dark", "Magical"] },
  Magical:     { weak: ["Dark", "Light"],          strong: ["Normal"] },
  Electricity: { weak: ["Ground"],                 strong: ["Water"] },
};

export default TYPE_CHART;
