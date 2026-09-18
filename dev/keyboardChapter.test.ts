import { expect, it } from 'vitest';
import { createDevAuthService, type DevCredentialFile } from './authCore';
import { emptyKeyboardMetrics, keyboardSequence, type KeyboardEvidence, type KeyboardLesson } from '../src/domain/keyboard';
import { keyboardTraining } from '../src/training/keyboard';
const credentials:DevCredentialFile={version:1,credentials:{student:{salt:'x',hash:'00'},teacher:{salt:'x',hash:'00'}}};
function proof(lesson:KeyboardLesson,rounds=3,drill=false):KeyboardEvidence {
 return {lesson,rounds,actions:Array.from({length:rounds},()=>keyboardSequence(lesson,drill)),metrics:{...emptyKeyboardMetrics(),enterPresses:12,correctEnter:12,escapePresses:6,correctEscape:6,copies:3,pastes:3,finds:3,selectAll:3}};
}
it('appends keyboard missions, validates all stages, saves sequential unlocks and never duplicates one receipt',()=>{
 const original=createDevAuthService(credentials);original.dashboard('dev-test');const saved=original.snapshot();
 for(const p of saved.progress.find(([id])=>id==='dev-test')![1])if(p.missionNumber<=8)Object.assign(p,{completed:true,unlocked:true,attemptCount:1});
 saved.progression.find(([id])=>id==='dev-test')![1].completedMissions=[1,2,3,4,5,6,7,8];
 const service=createDevAuthService(credentials,saved);
 expect(()=>service.startAttempt('dev-test','mission-keyboard-10')).toThrow('mission_locked');
 for(const lesson of [9,10,11] as KeyboardLesson[]){const attempt=service.startAttempt('dev-test',`mission-keyboard-${lesson}`);expect(()=>service.finishAttempt('dev-test',attempt.attemptId,900,40,{keyboard:{...proof(lesson),actions:[]}})).toThrow();
 service.finishAttempt('dev-test',attempt.attemptId,900,40,{keyboard:proof(lesson)});const balance=service.dashboard('dev-test').progression.currentCredits;
 service.finishAttempt('dev-test',attempt.attemptId,900,40,{});expect(service.dashboard('dev-test').progression.currentCredits).toBe(balance);}
 const restored=createDevAuthService(credentials,service.snapshot());expect(restored.dashboard('dev-test').completedMissions).toEqual([1,2,3,4,5,6,7,8,9,10,11]);
 expect(restored.dashboard('dev-test').missions.some(m=>m.missionNumber===12)).toBe(false);
});
it('validates seeded keyboard training targets and the actual shortcut sequence',()=>{
 for(const module of keyboardTraining){const task=module.generateTask(42,0);const evidence=proof(task.lesson,1,true);const payload={code:task.code,target:task.target,evidence};
 expect(module.validateTask(task,JSON.stringify(payload)).valid).toBe(true);
 expect(module.validateTask(task,JSON.stringify({...payload,code:'WRONG'})).valid).toBe(false);
 expect(module.validateTask(task,JSON.stringify({...payload,evidence:{...evidence,actions:[[]]}})).valid).toBe(false);}
});
