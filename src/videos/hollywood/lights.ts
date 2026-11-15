// Yorug'lik: kunduz, oltin soat va tun (Hollywood). Quyosh kameraga nisbatan, har kadr uchun muzlatilgan (world.ts).
// Kunduz va oltin qiymatlar ko'prik namunasidan (bridge, 4 tekshiruv bosqichi); tun — oy nuri + lampochkalar (bloom).
type C3 = [number, number, number];
export type Light = "day" | "golden" | "night";
export type LightPreset = {
  az: number; el: number;
  lit: C3; shade: C3; lift: C3; lambert: number; sideK: number; term: number;
  charTint: C3; charShade: number; charGrad: number; bodyGrad: number; sideTint: C3;
  blob: C3; actorShadow: boolean;
  top: string; hor: string; skyCurve: C3; fog: string; fogNear: number; fogFar: number; sunDisc: string;
  sunCol: string; sunI: number; sky: string; ground: string; hemiI: number;
  bias: number; normalBias: number;
};
export const LIGHTS: Record<Light, LightPreset> = {
  day: {
    az: 75, el: 48,
    lit: [1.58, 1.5, 1.33], shade: [0.3, 0.29, 0.36], lift: [0.05, 0.06, 0.11], lambert: 0.35, sideK: 0.84, term: 0.2,
    charTint: [1.0, 0.94, 0.92], charShade: 0.86, charGrad: 0.07, bodyGrad: 0.2, sideTint: [0.92, 0.90, 0.96],
    blob: [0.62, 0.58, 0.58], actorShadow: false,
    top: "#3e7fd2", hor: "#b8d0ec", skyCurve: [0.0, 0.5, 0.6], fog: "#b8d0ec", fogNear: 60, fogFar: 1100, sunDisc: "#000000",
    sunCol: "#fff3e0", sunI: 2.8, sky: "#dcecff", ground: "#b49a78", hemiI: 0.55,
    bias: -0.00025, normalBias: 0.015,
  },
  golden: {
    az: 6, el: 9,
    lit: [1.5, 0.68, 0.24], shade: [0.15, 0.15, 0.3], lift: [0.04, 0.06, 0.17], lambert: 0.35, sideK: 0.82, term: 0.07,
    charTint: [1.0, 0.78, 0.56], charShade: 0.88, charGrad: 0.1, bodyGrad: 0.25, sideTint: [0.85, 0.80, 0.95],
    blob: [0.75, 0.74, 0.9], actorShadow: true,
    top: "#6a4f8c", hor: "#ffd08a", skyCurve: [0.05, 0.6, 1.0], fog: "#efb489", fogNear: 90, fogFar: 1200, sunDisc: "#ffcf9e",
    sunCol: "#ffab5e", sunI: 5.5, sky: "#d8b0b8", ground: "#8a6a60", hemiI: 0.5,
    bias: -0.0006, normalBias: 0.03,
  },
  night: {
    az: 120, el: 35,
    lit: [0.42, 0.48, 0.78], shade: [0.07, 0.08, 0.16], lift: [0.03, 0.04, 0.1], lambert: 0.35, sideK: 0.8, term: 0.15,
    charTint: [0.55, 0.6, 0.9], charShade: 0.8, charGrad: 0.08, bodyGrad: 0.2, sideTint: [0.7, 0.72, 0.95],
    blob: [0.5, 0.5, 0.65], actorShadow: false,
    top: "#06102a", hor: "#22336a", skyCurve: [0.0, 0.5, 0.8], fog: "#1c2a58", fogNear: 80, fogFar: 1000, sunDisc: "#000000",
    sunCol: "#9fb4ff", sunI: 1.2, sky: "#33447a", ground: "#141428", hemiI: 0.4,
    bias: -0.0004, normalBias: 0.02,
  },
};

export type WorldLook = {
  sky: { c: string[]; e: number[] };
  bounce: C3;
  sat: number;
  cloud: { lit: string; mid: string; shade: string };
};
export const LOOK: Record<Light, WorldLook> = {
  day: {
    sky: { c: ["#b8d0ec", "#9cbfea", "#6a9fe0", "#4f8cdb", "#3373cc"], e: [0, 3, 8, 16, 40] },
    cloud: { lit: "#fbf8f1", mid: "#e1e5f3", shade: "#c3cbe9" }, bounce: [0, 0, 0], sat: 1.08,
  },
  golden: {
    sky: { c: ["#ffc47c", "#f7ae78", "#e8967c", "#c4848e", "#8a6f8a"], e: [0, 4, 10, 20, 40] },
    cloud: { lit: "#ffd2a8", mid: "#f2a08f", shade: "#a98fc4" }, bounce: [0.04, 0.02, 0.0], sat: 1.1,
  },
  night: {
    sky: { c: ["#2a3d78", "#1f2f63", "#162450", "#0e1a3d", "#070f28"], e: [0, 4, 10, 20, 40] },
    cloud: { lit: "#5a6aa0", mid: "#3c4a80", shade: "#26305e" }, bounce: [0, 0, 0], sat: 1.0,
  },
};
