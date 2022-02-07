import { Injectable } from '@angular/core'
import { ItemSocketService } from '@shared/module/poe/service/item/item-socket.service'
import { Item, ItemCategory, ItemRarity, StatType } from '@shared/module/poe/type'
import { EvaluateUserSettings } from '../component/evaluate-settings/evaluate-settings.component'

export interface EvaluateQueryItemResult {
  queryItem: Item
  defaultItem: Item
}

@Injectable({
  providedIn: 'root',
})
export class EvaluateQueryItemProvider {
  constructor(private readonly itemSocketService: ItemSocketService) {}

  public provide(item: Item, settings: EvaluateUserSettings): EvaluateQueryItemResult {
    const defaultItem: Item = this.copy({
      nameId: item.nameId,
      typeId: item.typeId,
      category: item.category,
      rarity: item.rarity,
      corrupted: item.corrupted,
      unidentified: item.unidentified,
      veiled: item.veiled,
      blighted: item.blighted,
      blightRavaged: item.blightRavaged,
      relic: item.relic,
      influences: item.influences || {},
      damage: {},
      stats: [],
      properties: {
        qualityType: (item.properties || {}).qualityType,
        ultimatum: {},
        heist: {
          requiredSkills: [],
        },
      },
      requirements: {},
      sockets: new Array((item.sockets || []).length).fill({}),
    })
    const queryItem = this.copy(defaultItem)

    // Deselect fractured & synthesized to avoid narrowing the query item too much
    if (queryItem.influences) {
      queryItem.influences.fractured = undefined
      queryItem.influences.synthesized = undefined
    }

    if (settings.evaluateQueryDefaultItemLevel) {
      queryItem.level = item.level
    }

    const count = this.itemSocketService.getLinkCount(item.sockets)
    if (count >= settings.evaluateQueryDefaultLinks) {
      queryItem.sockets = item.sockets
    }

    if (settings.evaluateQueryDefaultUltimatum) {
      const ultimatum = item.properties?.ultimatum
      if (ultimatum) {
        queryItem.properties.ultimatum = ultimatum
      }
    }

    const heist = item.properties?.heist
    if (heist) {
      const queryHeist = queryItem.properties.heist
      if (settings.evaluateQueryDefaultHeistRequiredLevels) {
        queryHeist.requiredSkills.push(...heist.requiredSkills)
      }

      if (settings.evaluateQueryDefaultHeistContracts) {
        queryHeist.objectiveValue = heist.objectiveValue
      }

      if (settings.evaluateQueryDefaultHeistBlueprints) {
        queryHeist.wingsRevealed = heist.wingsRevealed
        queryHeist.escapeRoutes = heist.escapeRoutes
        queryHeist.rewardRooms = heist.rewardRooms
      }
    }

    if (settings.evaluateQueryDefaultMiscs) {
      const prop = item.properties
      if (prop) {
        queryItem.properties.gemLevel = prop.gemLevel
        queryItem.properties.gemQualityType = prop.gemQualityType
        queryItem.properties.mapTier = prop.mapTier
        queryItem.properties.durability = prop.durability
        queryItem.properties.storedExperience = prop.storedExperience
        queryItem.properties.areaLevel = prop.areaLevel
        if (item.rarity === ItemRarity.Gem || prop.qualityType > 0) {
          queryItem.properties.quality = prop.quality
        }
      }
    }

    if (settings.evaluateQueryDefaultAttack) {
      queryItem.damage = item.damage

      const prop = item.properties
      if (prop) {
        if (item.category.startsWith(ItemCategory.Weapon)) {
          queryItem.properties.weaponAttacksPerSecond = prop.weaponAttacksPerSecond
          queryItem.properties.weaponCriticalStrikeChance = prop.weaponCriticalStrikeChance
        }
      }
    }

    if (settings.evaluateQueryDefaultDefense) {
      const prop = item.properties
      if (prop) {
        if (item.category.startsWith(ItemCategory.Armour)) {
          queryItem.properties.armourArmour = prop.armourArmour
          queryItem.properties.armourEvasionRating = prop.armourEvasionRating
          queryItem.properties.armourEnergyShield = prop.armourEnergyShield
          queryItem.properties.armourWard = prop.armourWard
          queryItem.properties.shieldBlockChance = prop.shieldBlockChance
        }
      }
    }

    if (!settings.evaluateQueryDefaultType) {
      if (
        item.rarity === ItemRarity.Normal ||
        item.rarity === ItemRarity.Magic ||
        item.rarity === ItemRarity.Rare
      ) {
        if (
          item.category.startsWith(ItemCategory.Weapon) ||
          item.category.startsWith(ItemCategory.Armour) ||
          item.category.startsWith(ItemCategory.Accessory)
        ) {
          queryItem.typeId = queryItem.nameId = undefined
        }
      }
    }

    const incursion = item.properties?.incursion
    if (incursion) {
      queryItem.properties.incursion = {
        openRooms: incursion.openRooms.map((room) => {
          const key = `${room.stat.type}.${room.stat.tradeId}`
          return settings.evaluateQueryDefaultStats[key] ? room : undefined
        }),
        closedRooms: incursion.closedRooms.map((room) => {
          const key = `${room.stat.type}.${room.stat.tradeId}`
          return settings.evaluateQueryDefaultStats[key] ? room : undefined
        }),
      }
    }

    if (item.stats) {
      if (
        (item.rarity === ItemRarity.Unique || item.rarity === ItemRarity.UniqueRelic) &&
        settings.evaluateQueryDefaultStatsUnique
      ) {
        queryItem.stats = item.stats
      } else {
        queryItem.stats = item.stats.map((stat) => {
          if (stat.type === StatType.Enchant && settings.evaluateQueryDefaultStatsEnchants) {
            return stat
          }
          const key = `${stat.type}.${stat.tradeId}`
          return settings.evaluateQueryDefaultStats[key] ? stat : undefined
        })
      }
    }

    return {
      defaultItem: this.copy(defaultItem),
      queryItem: this.copy(queryItem),
    }
  }

  private copy(item: Item): Item {
    return JSON.parse(JSON.stringify(item))
  }
}
