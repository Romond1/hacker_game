import type { SessionUser } from '../../api/client';
import type { LocalizedText, MissionDefinition } from '../../domain/mission';

function Bilingual({ user, text }: { user: SessionUser; text: LocalizedText }) {
  return <div className="bilingual"><div>{text.en}</div><small lang={user.supportLanguage}>{text[user.supportLanguage]}</small></div>;
}

export function Briefing({ mission, user, onStart, onBack }: { mission: MissionDefinition; user: SessionUser; onStart: () => void; onBack: () => void }) {
  return <main className="page briefing-page"><button className="back-link" onClick={onBack}>← Agent Home</button><div className="briefing-grid"><section><p className="eyebrow">MISSION {String(mission.number).padStart(2, '0')} / BRIEFING</p><h1>{mission.title.en}</h1><h2 lang={user.supportLanguage}>{mission.title[user.supportLanguage]}</h2><div className="objective-box"><span>OBJECTIVE</span><Bilingual user={user} text={mission.story} /></div><p className="step-label">SKILLS YOU WILL PRACTICE</p><ol className="skills-list">{mission.skills.map((skill, index) => <li key={skill.en}><b>0{index + 1}</b><Bilingual user={user} text={skill} /></li>)}</ol></section><aside className="briefing-side"><div className="guide-orb">CG</div><h3>Mission preparation</h3>{mission.briefing.map((item) => <Bilingual key={item.en} user={user} text={item} />)}<button className="primary-button" onClick={onStart}>Start tutorial <span>→</span></button></aside></div></main>;
}
