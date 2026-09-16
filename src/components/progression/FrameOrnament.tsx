import { useId } from 'react';

/** Scalable original crest artwork shared by shop previews and equipped portraits. */
export function FrameOrnament() {
  const id = useId().replace(/:/g, '');
  return <svg className="frame-ornament" viewBox="0 0 320 420" preserveAspectRatio="none" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-metal`} x1="10" y1="0" x2="310" y2="420" gradientUnits="userSpaceOnUse"><stop stopColor="var(--crest-light)"/><stop offset=".25" stopColor="var(--crest-metal)"/><stop offset=".5" stopColor="var(--crest-light)"/><stop offset=".72" stopColor="var(--crest-shadow)"/><stop offset="1" stopColor="var(--crest-light)"/></linearGradient>
      <linearGradient id={`${id}-gem`} x1="140" y1="0" x2="180" y2="60" gradientUnits="userSpaceOnUse"><stop stopColor="white"/><stop offset=".4" stopColor="var(--crest-energy)"/><stop offset="1" stopColor="var(--crest-shadow)"/></linearGradient>
    </defs>
    <path d="M160 8 188 29h91l29 31v304l-29 27h-82l-37 23-37-23H41l-29-27V60l29-31h91Z" fill="none" stroke={`url(#${id}-metal)`} strokeWidth="7"/>
    <path d="M48 42h81m62 0h81l23 24v291l-22 21h-78l-35 22-35-22H47l-22-21V66Z" stroke="var(--crest-metal)" strokeWidth="1.5"/>
    <path className="crest-current" d="M48 42h81m62 0h81l23 24v291l-22 21h-78l-35 22-35-22H47l-22-21V66Z" stroke="var(--crest-energy)" strokeWidth="3" strokeDasharray="45 170"/>
    <g fill={`url(#${id}-metal)`} stroke="var(--crest-light)" strokeWidth=".7">
      <path d="m10 48 51-27-19 24-21 36Z"/><path d="m310 48-51-27 19 24 21 36Z"/>
      <path d="m10 368 45 28-16-28-18-29Z"/><path d="m310 368-45 28 16-28 18-29Z"/>
      <path d="m90 24 44 4 26-22 26 22 44-4-26 19h-88Z"/>
      <path d="m107 393 31-9 22 15 22-15 31 9-53 25Z"/>
    </g>
    <g className="crest-jewel"><path d="m160 0 24 25-24 32-24-32Z" fill={`url(#${id}-gem)`} stroke="var(--crest-light)" strokeWidth="2"/><path d="m160 5-13 20 13 24 12-24Z" stroke="white" strokeOpacity=".65"/><path d="M147 25h25m-12-20v44" stroke="white" strokeOpacity=".45"/></g>
    <path d="m160 377 13 17-13 18-13-18Z" fill="var(--crest-energy)" stroke="var(--crest-light)" strokeWidth="2"/>
    <g className="crest-stars" fill="var(--crest-light)"><path d="m13 120 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/><path d="m307 274 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/><circle cx="12" cy="284" r="2"/><circle cx="307" cy="130" r="2"/></g>
  </svg>;
}
