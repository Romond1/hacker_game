import { expect, it } from 'vitest';
import { createDetectiveCodes, detectiveLevel } from './detective';
import { missionThree } from '../missions/mission-three';
it('generates different codes for consecutive attempts and distinct valid/decoy codes', () => {
 let previous = createDetectiveCodes();
 for(let i=0;i<30;i++){ const next=createDetectiveCodes(); expect(next.word).not.toBe(previous.word); expect(next.code).not.toBe(previous.code); expect(next.code).toMatch(/^[A-Z]{2}-\d{2}$/); expect(next.decoy).not.toBe(next.code); previous=next; }
});
it('builds both levels without mutating the shared mission',()=>{
 const codes=createDetectiveCodes(); const one=detectiveLevel(missionThree,0,codes), two=detectiveLevel(missionThree,1,codes);
 expect(one.completion).toMatchObject({code:codes.word}); expect(two.completion).toMatchObject({code:codes.code});
 expect(JSON.stringify(two.filesystem)).toContain('access-report.txt'); expect(JSON.stringify(two.filesystem)).toContain(codes.decoy);
 expect(missionThree.completion).toMatchObject({code:'ORBIT'});
});
