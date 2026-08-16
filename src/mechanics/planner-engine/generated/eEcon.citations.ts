/**
 * AUTO-GENERATED planner citations for ep.eEcon.
 * Source: EP/SDK graph formula + formulaSource only.
 * Regenerate: pnpm planner:codegen -- --family eEcon
 * NEVER invent formulas.
 */

export const PLANNER_FAMILY = "ep.eEcon" as const

export const PLANNER_CITATIONS = [
  {
    "nodeId": "hide.eEcon.EO2.coinBonus",
    "label": "eEcon!EO2 Coin Bonus hide",
    "formula": "=OR(\n  REGEXMATCH(AZ13, \"^None\"),\n  NOT(O$3<>\"DO\"),\n  WSPUTILITY_TOTAL_COINS_INVESTED(\n    CHOOSECOLS('_IDS'!$T$16:$X$21, MATCH(AZ5, '_IDS'!$T$2:$X$2, 0)),\n    '_IDS'!$R$16:$R$21)<=50000000000,\n  IDS_LAB_LEVEL(\"Workshop Enhancements\")=0,\n  BK5+1>BL5)",
    "formulaSource": "formulatext",
    "cells": [
      "eEcon!EO2"
    ]
  },
  {
    "nodeId": "hide.eEcon.EP2.freeUpgrades",
    "label": "eEcon!EP2 Free Upgrades hide",
    "formula": "=OR(\n  REGEXMATCH(AZ13, \"^None\"),\n  AO6+AS6=0,\n  NOT(O$3<>\"DO\"),\n  WSPUTILITY_TOTAL_COINS_INVESTED(\n    CHOOSECOLS('_IDS'!$T$16:$X$21, MATCH(AZ5, '_IDS'!$T$2:$X$2, 0)),\n    '_IDS'!$R$16:$R$21)<=5000000000000,\n  IDS_LAB_LEVEL(\"Workshop Enhancements\")=0,\n  BK6+1>BL6)",
    "formulaSource": "formulatext",
    "cells": [
      "eEcon!EP2"
    ]
  },
  {
    "nodeId": "hide.eEconStones.DW2.uwCd",
    "label": "eEcon Stones!DW2 UW CD composite hide",
    "formula": "=OR(\n  NOT(AZ17),\n  CA5<110)",
    "formulaSource": "formulatext",
    "cells": [
      "eEcon Stones!DW2"
    ]
  }
] as const

export type PlannerCitation = (typeof PLANNER_CITATIONS)[number]
