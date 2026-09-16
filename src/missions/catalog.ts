import { dragMission, contextMission } from './mouse-missions';
import { recoveryMission } from './recovery-mission';
import { scrollMission } from './scroll-mission';
import { missionOne } from './mission-one';
import { missionTwo } from './mission-two';
import { missionThree } from './mission-three';
import { missionFour } from './mission-four';

export const MISSIONS = [missionOne, missionTwo, scrollMission, dragMission, contextMission, missionFour, recoveryMission, missionThree] as const;

export function getMission(id: string) {
  return MISSIONS.find((mission) => mission.id === id);
}

export function getMissionByNumber(number: number) {
  return MISSIONS.find((mission) => mission.number === number);
}
