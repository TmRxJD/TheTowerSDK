/** @generated node scripts/build-main-spawn-chances.mjs — do not edit */
export type MainSpawnTypeSceneChancesV29 = {
  chanceNormalEnemy: number
  chanceFastEnemy: number
  chanceTankEnemy: number
  chanceRangedEnemy: number
  chanceProtectorEnemy: number
}

/** Scene-serialized Main.chance*Enemy ints from APK scan; null until extract populates primary. */
export const MAIN_SPAWN_TYPE_SCENE_CHANCES_V29: MainSpawnTypeSceneChancesV29 | null = {
  "chanceNormalEnemy": 70,
  "chanceFastEnemy": 15,
  "chanceTankEnemy": 15,
  "chanceRangedEnemy": 0,
  "chanceProtectorEnemy": 0
}
