import type { LocalizedText, MissionDefinition } from '../domain/mission';
import { keyboardTitles, type KeyboardLesson } from '../domain/keyboard';
const t = (en:string,it:string,ja:string):LocalizedText => ({en,it,ja});
const content = {
  9: {title:t(keyboardTitles[9],'Invio ed Esc','EnterとEscape'), objective:t('Open the terminal with Enter. Submit its code, close notices with Escape, then activate the relay.','Apri il terminale con Invio. Conferma il codice, chiudi gli avvisi con Esc e attiva il relay.','Enterで端末を開きコードを送信。Escapeで通知を閉じ、リレーを起動。'), tutorial:t('ENTER = confirm / go. ESC = cancel / close. Now try both keys in the practice computer.','INVIO = conferma / vai. ESC = annulla / chiudi. Prova entrambi nel computer.','ENTER＝決定・進む。ESC＝キャンセル・閉じる。練習用PCで試そう。')},
  10: {title:t(keyboardTitles[10],'Ctrl: il tasto aiutante','Ctrl：お助けキー'), objective:t('Copy each access key to its relay and authorize it. Restore three relays.','Copia ogni codice nel suo relay e autorizzalo. Ripristina tre relay.','アクセスキーを各リレーにコピーして認証。3つのリレーを復旧しよう。'), tutorial:t('Ctrl is a helper key. Hold it down, then tap another key. Learn the move before restoring the relays.','Ctrl è un tasto aiutante. Tienilo premuto, poi premi un altro tasto. Impara il movimento prima di ripristinare i relay.','Ctrlはお助けキー。押したまま別のキーを押そう。リレーを復旧する前に練習しよう。')},
  11: {title:t(keyboardTitles[11],'Strumenti potenti della tastiera','キーボードの便利な機能'), objective:t('Locate the requested network record and authorize its relay. Use Find, Select All, Copy and Paste; Enter confirms and Escape closes.','Trova il record richiesto e autorizza il relay. Usa Trova, Seleziona tutto, Copia e Incolla; Invio conferma, Esc chiude.','指定レコードを探してリレーを認証。検索・全選択・コピー・貼り付けを使おう。Enterで決定、Escapeで閉じる。'), tutorial:t('Ctrl is still your helper. Use F to find a record. Use A to select all the text in a field. Watch, then try.','Ctrl è ancora il tuo aiutante. F trova un record. A seleziona tutto il testo in un campo. Guarda, poi prova.','Ctrlはお助けキー。Fで検索、Aで入力欄の文字を全選択。見てから練習しよう。')},
};
export const keyboardMissions: MissionDefinition[] = ([9,10,11] as KeyboardLesson[]).map(number => ({
 id:`mission-keyboard-${number}`, number, slug:`keyboard-${number}`, keyboardLesson:number,
 lifecycle:{prerequisiteMissionId:number===9?'mission-3':`mission-keyboard-${number-1}`,replay:'allowed',difficulty:'standard',warningState:'none',unlocks:[`keyboard-drill-${number}`]},
 title:content[number].title, story:content[number].objective, skills:[content[number].title],briefing:[content[number].objective],
 tutorial:[{id:'keyboard-practice',title:content[number].title,body:content[number].tutorial,action:'practice_keyboard'}],
 translations:{objective:content[number].objective,guideExhausted:content[number].tutorial},
 filesystem:{id:'desktop',name:'Desktop',type:'folder',children:[]},
 objectives:[0,1,2].map(i=>({id:`keyboard-stage-${i}`,trigger:'code_submitted' as const,targetId:`stage-${i}`,text:t(`Restore relay ${i+1}`,`Ripristina relay ${i+1}`,`リレー${i+1}を復旧`)})), hints:[],
 scoring:{completion:400,objectives:300,accuracy:150,noHint:100,englishIndependence:50,time:0,targetSeconds:240},
 reward:t('KEYBOARD SKILL SECURED','ABILITÀ TASTIERA ACQUISITA','キーボードスキル習得'),completion:{type:'mouse_action',targetObjectiveId:'keyboard-stage-2'},
}));
