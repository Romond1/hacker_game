import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AmbientLayer } from './AmbientLayer';
import { OperatorMessage } from './OperatorMessage';
import { ProgressMeter } from './ProgressMeter';
import { RewardCounter } from './RewardCounter';
import { StoryBeatSequence } from './StoryBeatSequence';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('game feel primitives', () => {
  it('renders decorative ambience without exposing noise to assistive technology', () => {
    const { container } = render(<AmbientLayer variant="signal" />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('reports labelled progress numerically', () => {
    render(<ProgressMeter label="Network sector" value={2} max={4} detail="2 / 4 nodes secured" />);
    expect(screen.getByRole('progressbar', { name: 'Network sector' })).toHaveAttribute('aria-valuenow', '2');
    expect(screen.getByText('2 / 4 nodes secured')).toBeInTheDocument();
  });

  it('announces a concise operator message', () => {
    render(<OperatorMessage title="CYBER GUIDE" message="Signal confirmed." tone="success" />);
    expect(screen.getByRole('status')).toHaveTextContent('Signal confirmed.');
  });

  it('shows a counter final value immediately when motion is reduced', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    render(<RewardCounter value={1000} prefix="+" suffix=" XP" />);
    expect(screen.getByText('+1,000 XP')).toBeInTheDocument();
  });

  it('advances and can skip a story beat sequence', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
    vi.useFakeTimers();
    const complete = vi.fn();
    render(<StoryBeatSequence ariaLabel="Incoming signal" steps={[{ text: 'INCOMING TRANSMISSION', duration: 500 }, { text: 'NODE DETECTED', duration: 500 }]} onComplete={complete} skippable />);
    expect(screen.getByText('INCOMING TRANSMISSION')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByText('NODE DETECTED')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /skip/i }));
    expect(complete).toHaveBeenCalledOnce();
  });
  it('collapses story timing and completes under reduced motion', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    vi.useFakeTimers();
    const complete = vi.fn();
    render(<StoryBeatSequence ariaLabel="Reduced signal" supportLanguage="ja" steps={[{ text: 'FIRST' }, { text: 'FINAL', supportText: '最終' }]} onComplete={complete} />);
    expect(screen.getByText('FINAL')).toBeInTheDocument();
    expect(screen.getByText('最終')).toHaveAttribute('lang', 'ja');
    act(() => vi.runAllTimers());
    expect(complete).toHaveBeenCalledOnce();
  });
});
