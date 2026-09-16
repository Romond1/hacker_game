import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptyProgression } from '../../domain/progression';
import type { SessionUser } from '../../api/client';
import { HackerShop } from './HackerShop';
import { IdentityProtocol, Transmission } from './IdentityProtocol';
import { HackerProfile } from './HackerProfile';
import { RewardSequence } from './RewardSequence';

const user: SessionUser = { id: 'a', username: 'a', displayName: 'Student', role: 'student', supportLanguage: 'it', csrfToken: 'token', themeColor: 'green' };
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('progression experiences', () => {
  it('hides store products before graduation', () => {
    render(<HackerShop user={user} progression={emptyProgression()} onUpdate={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('Complete Rookie Training to gain access.')).toBeInTheDocument();
    expect(screen.queryByText('Neon Pointer')).not.toBeInTheDocument();
  });
  it('purchases then equips an owned item using saved server state', async () => {
    const state = { ...emptyProgression(), playerRank: 'operator', completedMissions: [1,2,3], currentCredits: 70, storyFlags: { shopUnlocked: true } };
    const saved = { ...state, currentCredits: 30, inventory: ['hero-wolf-standard'] };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, data: { progression: saved } }))));
    const onUpdate = vi.fn();
    const view = render(<HackerShop user={user} progression={state} onUpdate={onUpdate} onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Buy Cyber Wolf Cadet/ }));
    expect(screen.getByText('PROCESSING PURCHASE…')).toBeInTheDocument();
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith(saved));
    expect(await screen.findByText('ITEM ACQUIRED')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Equip now/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Return to shop/i }));
    view.rerender(<HackerShop user={user} progression={saved} onUpdate={onUpdate} onBack={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Equip Cyber Wolf Cadet/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Preview elite armour' }));
    expect(screen.getByRole('button', { name: /Future campaign unlock for Cyber Wolf Centurion/ })).toBeDisabled();
  });
  it('toggles in-shop ephemeral trials for pointers and assistants without altering inventory', () => {
    const state = { ...emptyProgression(), playerRank: 'operator', completedMissions: [1,2,3], currentCredits: 70, storyFlags: { shopUnlocked: true } };
    render(<HackerShop user={user} progression={state} onUpdate={vi.fn()} onBack={vi.fn()} />);
    
    // Switch to Pointers department
    fireEvent.click(screen.getByRole('button', { name: /02\. MOUSE STUDIO/i }));
    expect(screen.getByText(/POINTER CALIBRATION PAD/i)).toBeInTheDocument();
    
    // Click TRY IN SHOP on Tactical Crosshair
    const tryBtn = screen.getByRole('button', { name: /Try Tactical Crosshair in shop/i });
    fireEvent.click(tryBtn);
    expect(screen.getByText(/TRIAL MODE ACTIVE/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Tactical Crosshair/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Stop testing Tactical Crosshair/i })).toBeInTheDocument();
    
    // Test clear all trials button
    fireEvent.click(screen.getByRole('button', { name: /CLEAR ALL TRIALS/i }));
    expect(screen.queryByText(/TRIAL MODE ACTIVE/i)).not.toBeInTheDocument();
  });
  it('enables god mode for test.hacker with unlimited credits, catalog access without shopUnlocked, and bypassed rank locks', () => {
    const godUser: SessionUser = { ...user, username: 'test.hacker', canTestShop: true };
    // Even when shopUnlocked is false, god mode can access shop catalog
    const state = { ...emptyProgression(), playerRank: 'rookie', completedMissions: [1], currentCredits: 20, storyFlags: { shopUnlocked: false } };
    render(<HackerShop user={godUser} progression={state} onUpdate={vi.fn()} onBack={vi.fn()} />);
    
    expect(screen.getByText(/GOD MODE/i)).toBeInTheDocument();
    expect(screen.getByText('99,999')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Preview legendary armour' }));
    // Future/Legendary hero (Cyber Wolf Imperator) should NOT be disabled in God Mode even at rookie rank
    expect(screen.getByRole('button', { name: /Buy Cyber Wolf Imperator/i })).not.toBeDisabled();
  });
  it('locks future heroes for normal accounts with dedicated lock notice', () => {
    const state = { ...emptyProgression(), playerRank: 'operator', completedMissions: [1,2,3], currentCredits: 9999, storyFlags: { shopUnlocked: true } };
    render(<HackerShop user={user} progression={state} onUpdate={vi.fn()} onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Preview elite armour' }));
    expect(screen.getAllByText(/Reserved for future campaign operations/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Future campaign unlock for Cyber Wolf Centurion/i })).toBeDisabled();
  });
  it('shows affordability progress and remaining Credits for aspirational items', () => {
    const state = { ...emptyProgression(), completedMissions: [1,2,3,4,5,6,7], currentCredits: 70, storyFlags: { shopUnlocked: true, rareEquipmentUnlocked: true } };
    render(<HackerShop user={user} progression={state} onUpdate={vi.fn()} onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Preview rare armour' }));
    expect(screen.getByText('30 more needed')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: /Cyber Wolf Vanguard affordability/i })).toHaveAttribute('aria-valuenow', '70');
    fireEvent.click(screen.getByRole('button', { name: 'Preview elite armour' }));
    expect(screen.getAllByText(/Requires Infiltrator rank/i).length).toBeGreaterThan(0);

    // Switch to Themes department
    fireEvent.click(screen.getByRole('button', { name: /03\. THEMES/i }));
    expect(screen.getByRole('progressbar', { name: /Matrix Terminal affordability/i })).toHaveAttribute('aria-valuenow', '70');
  });
  it('holds reward navigation for three seconds and shows the confirmed receipt', () => {
    vi.useFakeTimers();
    const next = vi.fn();
    render(<RewardSequence user={user} missionNumber={2} progression={emptyProgression()} reward={{ source: 'mission-2', eventId: 'x', xp: 800, credits: 20, totalXP: 1600, currentCredits: 40, creditLimitReached: false }} onContinue={next} />);
    expect(screen.getByText('VALIDATING ACCESS…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue/ })).toBeDisabled();
    act(() => vi.advanceTimersByTime(3000));
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    expect(next).toHaveBeenCalledOnce();
    expect(screen.getByText('+20')).toBeInTheDocument();
    expect(screen.getByText('+800')).toBeInTheDocument();
  });
  it('reveals the Mission 6 story outcome instead of rookie training progress', () => {
    vi.useFakeTimers();
    render(<RewardSequence user={user} missionNumber={6} progression={{ ...emptyProgression(), completedMissions: [1,2,3,6] }} reward={{ source: 'mission-4', eventId: 'm4', xp: 1000, credits: 30, totalXP: 3400, currentCredits: 90, creditLimitReached: false }} onContinue={vi.fn()} />);
    expect(screen.getByText('COMMUNICATION NODE SECURED')).toBeInTheDocument();
    expect(screen.getByText('SOURCE IDENTIFIED')).toBeInTheDocument();
    expect(screen.getByText('FONTE IDENTIFICATA')).toHaveAttribute('lang', 'it');
    expect(screen.getByText('UNKNOWN NETWORK ACTIVITY DETECTED')).toBeInTheDocument();
    expect(screen.queryByLabelText(/training missions complete/i)).not.toBeInTheDocument();
  });
  it('shows identity input after the breach and saves a suggested codename', async () => {
    const state = { ...emptyProgression(), hackerIdentityUnlocked: true };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, data: { progression: { ...state, hackerCodename: 'NOVA' } } }))));
    const update = vi.fn();
    render(<IdentityProtocol user={user} progression={state} onUpdate={update} />);
    fireEvent.click(screen.getByRole('button', { name: /Activate identity/ }));
    fireEvent.click(screen.getByRole('button', { name: 'NOVA' }));
    fireEvent.click(screen.getByRole('button', { name: /Save codename/ }));
    await waitFor(() => expect(update).toHaveBeenCalledWith(expect.objectContaining({ hackerCodename: 'NOVA' })));
  });
  it('uses the skippable story sequence before an incoming transmission', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
    render(<Transmission user={user} progression={emptyProgression()} onUpdate={vi.fn()} />);
    expect(screen.getByRole('region', { name: /Incoming transmission/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Enter home base/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Skip sequence/i }));
    expect(screen.getByRole('button', { name: /Enter home base/i })).toBeInTheDocument();
  });
  it('persists mute through the server-owned progression state', async () => {
    const state = emptyProgression(); const saved = { ...state, settings: { muted: false } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, data: { progression: saved } }))));
    const update = vi.fn();
    render(<HackerProfile user={user} progression={state} onShop={vi.fn()} onUpdate={update} />);
    fireEvent.click(screen.getByRole('button', { name: /Sound muted/i }));
    await waitFor(() => expect(update).toHaveBeenCalledWith(saved));
  });

  it('renders Stitch split-panel Pointers department with magnified preview, interactive calibration pad, and accessibility sizing', () => {
    const state = { ...emptyProgression(), playerRank: 'operator', completedMissions: [1, 2, 3], currentCredits: 200, storyFlags: { shopUnlocked: true } };
    const { container } = render(<HackerShop user={user} progression={state} onUpdate={vi.fn()} onBack={vi.fn()} />);

    // Switch to Pointers department
    fireEvent.click(screen.getByRole('button', { name: /02\. MOUSE STUDIO/i }));

    // Verify split layout container
    expect(container.querySelector('.shop-split-layout')).toBeInTheDocument();

    // Verify magnified preview card and telemetry
    expect(screen.getByText(/RETICLE CALIBRATION \/\/ 4X MAGNIFIED/i)).toBeInTheDocument();
    expect(screen.getByText(/CIRCUIT CYAN #00F0FF/i)).toBeInTheDocument();

    // Verify calibration pad interactive targets
    expect(screen.getByRole('button', { name: /TEST BUTTON/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /SECURE LINK/i })).toBeInTheDocument();
    expect(screen.getByText(/0x4F/i)).toBeInTheDocument();
    expect(screen.getByText(/DIR mission-files/i)).toBeInTheDocument();
    expect(screen.getByText(/TXT cipher-key.key/i)).toBeInTheDocument();
    expect(screen.getByText(/KEYCARD TOKEN/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Click accuracy bullseye target/i })).toBeInTheDocument();

    // Test precision bullseye click
    fireEvent.click(screen.getByRole('button', { name: /Click accuracy bullseye target/i }));
    expect(screen.getByText(/ACCURACY:/i)).toBeInTheDocument();
  });

  it('toggles cursor size between Standard and Large and persists to localStorage without API mutations', () => {
    const state = { ...emptyProgression(), playerRank: 'operator', completedMissions: [1, 2, 3], currentCredits: 200, storyFlags: { shopUnlocked: true } };
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { container } = render(<HackerShop user={user} progression={state} onUpdate={vi.fn()} onBack={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /02\. MOUSE STUDIO/i }));

    const standardBtn = screen.getByRole('button', { name: /Standard \(28px\)/i });
    const largeBtn = screen.getByRole('button', { name: /Large \(36px\)/i });

    expect(standardBtn).toHaveAttribute('aria-pressed', 'true');
    expect(largeBtn).toHaveAttribute('aria-pressed', 'false');

    // Switch to Large
    fireEvent.click(largeBtn);
    expect(largeBtn).toHaveAttribute('aria-pressed', 'true');
    expect(standardBtn).toHaveAttribute('aria-pressed', 'false');
    expect(localStorage.getItem('cyber_hero_cursor_size')).toBe('large');
    expect(container.querySelector('.cyber-shop-page')).toHaveAttribute('data-cursor-size', 'large');

    // Sizing change must NOT trigger any API mutations
    expect(fetchSpy).not.toHaveBeenCalled();

    // Switch back to Standard
    fireEvent.click(standardBtn);
    expect(standardBtn).toHaveAttribute('aria-pressed', 'true');
    expect(localStorage.getItem('cyber_hero_cursor_size')).toBe('standard');
    expect(container.querySelector('.cyber-shop-page')).toHaveAttribute('data-cursor-size', 'standard');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('renders Stitch split-panel Themes department with miniature dashboard and mission computer previews', () => {
    const state = { ...emptyProgression(), playerRank: 'operator', completedMissions: [1, 2, 3], currentCredits: 200, storyFlags: { shopUnlocked: true } };
    const { container } = render(<HackerShop user={user} progression={state} onUpdate={vi.fn()} onBack={vi.fn()} />);

    // Switch to Themes department
    fireEvent.click(screen.getByRole('button', { name: /03\. THEMES/i }));

    // Verify split layout container
    expect(container.querySelector('.shop-split-layout')).toBeInTheDocument();

    // Verify miniature previews
    expect(screen.getByText(/MINIATURE DASHBOARD PREVIEW/i)).toBeInTheDocument();
    expect(screen.getByText(/MINIATURE MISSION COMPUTER PREVIEW/i)).toBeInTheDocument();
    expect(screen.getByText(/MISSION 01: COMPUTER TRAINING/i)).toBeInTheDocument();
    expect(screen.getByText(/Desktop \/ training/i)).toBeInTheDocument();

    // Verify theme items in selection list
    expect(screen.getByText('Orbit Blue Matrix')).toBeInTheDocument();
    expect(screen.getByText('Matrix Terminal')).toBeInTheDocument();
    expect(screen.getByText('Solar Amber Matrix')).toBeInTheDocument();
  });

  it('applies theme trial to shop container without altering application root or persistent state', () => {
    const state = { ...emptyProgression(), playerRank: 'operator', completedMissions: [1, 2, 3], currentCredits: 200, storyFlags: { shopUnlocked: true } };
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { container } = render(<HackerShop user={user} progression={state} onUpdate={vi.fn()} onBack={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /03\. THEMES/i }));

    const shopRoot = container.querySelector('.cyber-shop-page')!;
    expect(shopRoot).not.toHaveAttribute('data-theme', 'orbit-blue');

    // Try Orbit Blue Matrix
    const tryBtn = screen.getByRole('button', { name: /Try Orbit Blue Matrix in shop/i });
    fireEvent.click(tryBtn);

    // Shop root gets trial data-theme attribute
    expect(shopRoot).toHaveAttribute('data-theme', 'orbit-blue');
    expect(screen.getByText(/TRIAL MODE ACTIVE/i)).toBeInTheDocument();

    // Trial should NOT make API writes
    expect(fetchSpy).not.toHaveBeenCalled();

    // Stop trial
    const stopBtn = screen.getByRole('button', { name: /Stop testing Orbit Blue Matrix/i });
    fireEvent.click(stopBtn);
    expect(shopRoot).not.toHaveAttribute('data-theme', 'orbit-blue');
    expect(screen.queryByText(/TRIAL MODE ACTIVE/i)).not.toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

});
