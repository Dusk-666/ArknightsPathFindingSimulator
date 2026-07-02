import type { EnemyTypeInput } from "../../engine/models";
import { createSequentialId } from "./ids";

export function createEnemyType(existingEnemyTypes: EnemyTypeInput[]): EnemyTypeInput {
  const id = createSequentialId(existingEnemyTypes.map((enemyType) => enemyType.id), "enemy");

  return {
    id,
    name: `新敌人 ${existingEnemyTypes.length + 1}`,
    move_mode_override: null,
    attribute_speed: 2.8,
    moveMultiplier: 1,
    steeringFactor: 16,
    maxSteeringForce: 30,
    halfBodyWidth: 0.2,
    footOffset: [0, 0.2],
    cursor_offset: [0, 0]
  };
}

export function duplicateEnemyType(source: EnemyTypeInput, existingEnemyTypes: EnemyTypeInput[]): EnemyTypeInput {
  const clone = createEnemyType(existingEnemyTypes);
  return {
    ...source,
    ...clone,
    name: `${source.name} 复制`
  };
}
