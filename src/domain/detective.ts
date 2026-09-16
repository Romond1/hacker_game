import type { MissionDefinition } from './mission';
const words = ['ORBIT','NOVA','COMET','LUNAR','SOLAR','LASER','RADAR','ROVER','ASTRO','PULSE','PRISM','SPARK'];
let previous = { word: '', code: '' };
export function createDetectiveCodes() {
  const random = (max: number) => crypto.getRandomValues(new Uint32Array(1))[0] % max;
  const choices = words.filter(word => word !== previous.word);
  const word = choices[random(choices.length)];
  const makeCode = () => `${String.fromCharCode(65+random(26),65+random(26))}-${10+random(90)}`;
  let code = makeCode(); while (code === previous.code) code = makeCode();
  let decoy = makeCode(); while (decoy === code) decoy = makeCode();
  previous = { word, code };
  return { word, code, decoy, validFirst: random(2) === 0 };
}
export function detectiveLevel(base: MissionDefinition, level: number, codes: ReturnType<typeof createDetectiveCodes>): MissionDefinition {
  const mission = structuredClone(base);
  const folder = level === 0 ? 'Investigation' : 'Verification';
  const filename = level === 0 ? 'mission-report.txt' : 'access-report.txt';
  const code = level === 0 ? codes.word : codes.code;
  const report = level === 0
    ? { en: `MISSION REPORT\n\nAgent Code: ${code}\n\nType this word or select and copy it into the Agent Code box.`, it: `RAPPORTO MISSIONE\n\nCodice Agente: ${code}\n\nScrivi la parola oppure selezionala e copiala nella casella Codice Agente.`, ja: `ミッションレポート\n\nエージェントコード：${code}\n\nこの単語を入力するか、選択してコード入力欄にコピーしてください。` }
    : { en: `ACCESS REPORT\n\nRead the labels carefully. Only the ACTIVE code is valid. The TRAINING code is a fake example; do not submit it.\n\n${(codes.validFirst ? [`ACTIVE code: ${code}`,`TRAINING code (fake): ${codes.decoy}`] : [`TRAINING code (fake): ${codes.decoy}`,`ACTIVE code: ${code}`]).join('\n\n')}\n\nEnter the ACTIVE code, including its dash.`, it: `RAPPORTO ACCESSO\n\nSolo il codice ATTIVO è valido. Il codice di ESERCIZIO è un esempio finto.\n\nATTIVO: ${code}\nESERCIZIO (finto): ${codes.decoy}\n\nInserisci il codice ATTIVO, incluso il trattino.`, ja: `アクセスレポート\n\n有効なコードだけを使います。練習用コードは偽物です。\n\n有効：${code}\n練習用（偽物）：${codes.decoy}\n\nハイフンも含めて有効なコードを入力してください。` };
  const documents = mission.filesystem.children!.find(node => node.id === 'documents')!;
  const investigation = documents.children!.find(node => node.id === 'investigation')!;
  investigation.name = folder;
  const file = investigation.children!.find(node => node.id === 'mission-report')!;
  file.name = filename; file.content = report;
  mission.translations.objective = { en: `Level ${level+1}/2: open Documents / ${folder} / ${filename}. ${level === 0 ? 'Read the Agent Code' : 'Read both codes and choose the ACTIVE code'}, then type or paste it below.`, it: `Livello ${level+1}/2: apri Documents / ${folder} / ${filename}. ${level === 0 ? 'Leggi il Codice Agente' : 'Scegli il codice ATTIVO'}, poi scrivilo o incollalo sotto.`, ja: `レベル${level+1}/2：Documents / ${folder} / ${filename}を開き、${level === 0 ? 'エージェントコード' : '有効なコード'}を読んで入力または貼り付けてください。` };
  mission.completion = { type:'confirm_code', targetObjectiveId:'open-report', code };
  mission.hints = mission.hints.map(hint => ({...hint,text:mission.translations.objective}));
  return mission;
}
