import type { SessionUser } from '../../api/client';
import type { LocalizedText, MissionDefinition } from '../../domain/mission';
import { AmbientLayer } from '../gamefeel/AmbientLayer';
import { OperatorMessage } from '../gamefeel/OperatorMessage';

function Bilingual({ user, text }: { user: SessionUser; text: LocalizedText }) {
  return <div className="bilingual"><div>{text.en}</div><small lang={user.supportLanguage}>{text[user.supportLanguage]}</small></div>;
}

export function Briefing({ mission, user, onStart, onBack }: { mission: MissionDefinition; user: SessionUser; onStart: () => void; onBack: () => void }) {
  return <main className="page briefing-page"><AmbientLayer variant="scan" /><button className="back-link" onClick={onBack}>← Agent Home</button><div className="briefing-grid"><section><p className="eyebrow">MISSION {String(mission.number).padStart(2, '0')} / BRIEFING</p><h1>{mission.title.en}</h1><h2 lang={user.supportLanguage}>{mission.title[user.supportLanguage]}</h2><div className="objective-box"><span>PRIMARY OBJECTIVE</span><Bilingual user={user} text={mission.story} /></div><p className="step-label">MISSION STEPS</p><ol className="mission-step-list">{mission.objectives.map((objective, index) => <li key={objective.id}><b>{String(index + 1).padStart(2, '0')}</b><Bilingual user={user} text={objective.text} /></li>)}</ol><details className="briefing-skills"><summary>Skills you will practice</summary><ol className="skills-list">{mission.skills.map((skill, index) => <li key={skill.en}><b>{String(index + 1).padStart(2, '0')}</b><Bilingual user={user} text={skill} /></li>)}</ol></details></section><aside className="briefing-side"><OperatorMessage title="CYBER GUIDE / INTEL" message="Review the route. Start when your signal is steady." /><h3>Mission intel</h3>{mission.briefing.map((item) => <Bilingual key={item.en} user={user} text={item} />)}<button className="primary-button" onClick={onStart}>Start tutorial <span>→</span></button></aside></div></main>;
}
