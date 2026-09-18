import { createSeededRandom, type TrainingModuleDefinition } from '../domain/training.ts';
import { validKeyboardEvidence, keyboardTitles, type KeyboardLesson } from '../domain/keyboard.ts';
export type KeyboardTask = {lesson:KeyboardLesson;code:string;target:string};
export type KeyboardTrainingEvidence = {keyboard:string};
export const keyboardTraining = ([9,10,11] as KeyboardLesson[]).map(lesson => {
 const title=`${keyboardTitles[lesson]} Practice`;
 const module:TrainingModuleDefinition<KeyboardTask,string,KeyboardTrainingEvidence,'keyboard'> = {
  id:`keyboard-drill-${lesson}`,kind:'keyboard',title,description:'Short keyboard repetitions with fresh targets.',skill:keyboardTitles[lesson],
  localized:{title:{en:title,it:`Pratica tastiera ${lesson}`,ja:`キーボード練習 ${lesson}`},description:{en:'Short keyboard repetitions with fresh targets.',it:'Ripeti brevi esercizi con nuovi obiettivi.',ja:'新しい目標で短いキー操作を繰り返そう。'},skill:{en:keyboardTitles[lesson],it:lesson===9?'Invio / Esc':lesson===10?'Ctrl+C / Ctrl+V':'Ctrl+F / Ctrl+A',ja:lesson===9?'Enter / Escape':lesson===10?'Ctrl+C / Ctrl+V':'Ctrl+F / Ctrl+A'}},
  linkedMissionId:`mission-keyboard-${lesson}`,requiredCompletedMissions:[lesson],rounds:3,difficulty:'beginner',generatorVersion:1,
  scoreRules:{basePerSuccess:900,errorPenalty:200,targetSeconds:90,timeBonus:500},reward:{xpMax:150,creditsPerRun:1,creditCap:20},speedAchievementSeconds:90,
  generateTask(seed,round){const random=createSeededRandom(seed+round*7919);return {lesson,code:`KEY-${100+Math.floor(random()*900)}`,target:`NODE-${10+Math.floor(random()*90)}`};},
  validateTask(task,keyboard){let valid=false;try{const payload=JSON.parse(keyboard);valid=payload.code===task.code&&payload.target===task.target&&validKeyboardEvidence(payload.evidence,task.lesson,1,true);}catch{/* malformed evidence is rejected */}return {valid,evidence:{keyboard},mistakes:valid?0:1};},
 };return module;
});
