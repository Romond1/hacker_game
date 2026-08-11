import { missionOne } from './mission-one';
import { missionTwo } from './mission-two';
import { missionThree } from './mission-three';

export const MISSIONS = [missionOne, missionTwo, missionThree] as const;

export function getMission(id: string) {
  return MISSIONS.find((mission) => mission.id === id);
}

export function getMissionByNumber(number: number) {
  return MISSIONS.find((mission) => mission.number === number);
}
