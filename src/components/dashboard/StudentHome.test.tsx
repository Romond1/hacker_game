import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MissionProgress, SessionUser, StudentDashboard, TrainingProgress } from '../../api/client';
import { emptyProgression } from '../../domain/progression';
import { StudentHome } from './StudentHome';

const mirko: SessionUser = { id: 'dev-mirko', username: 'mirko.hacker', displayName: 'Mirko', role: 'student', supportLanguage: 'it', themeColor: 'blue', csrfToken: 'token' };
const testHacker: SessionUser = { ...mirko, id: 'dev-test-hacker', username: 'test.hacker', displayName: 'Test Hacker', supportLanguage: 'ja' };

function mission(missionNumber: number, state: Partial<MissionProgress> = {}): MissionProgress {
  return { missionId: missionNumber === 4 ? 'mission-drag' : missionNumber === 5 ? 'mission-context' : missionNumber === 6 ? 'mission-4' : `mission-${missionNumber}`, missionNumber, unlocked: missionNumber === 1, completed: false, bestScore: null, bestTimeSeconds: null, totalPoints: 0, attemptCount: 0, ...state };
}

function dashboard(missions: MissionProgress[]): StudentDashboard {
  return { totalPoints: missions.reduce((sum, item) => sum + item.totalPoints, 0), rank: 'Rookie Agent', currentMission: missions.find((item) => item.unlocked && !item.completed)?.missionNumber ?? 3, completedMissions: missions.filter((item) => item.completed).map((item) => item.missionNumber), missions, bestScore: null, bestTimeSeconds: null, attempts: [] };
}

describe('StudentHome', () => {
  it('offers each robot training directly below its completed mission', () => {
    const onRobotDefense = vi.fn();
    const view = render(<StudentHome user={mirko} dashboard={dashboard([mission(1, { completed: true }), mission(2, { unlocked: true }), mission(3)])} onMission={vi.fn()} onSettings={vi.fn()} onRobotDefense={onRobotDefense} />);
    const first = screen.getByRole('article', { name: /Mission 1:/i });
    fireEvent.click(within(first).getByRole('button', { name: /Train Base Defense/i }));
    expect(onRobotDefense).toHaveBeenCalledWith('base_defense');
    expect(within(screen.getByRole('article', { name: /Mission 2:/i })).queryByRole('button', { name: /Train Reinforcements/i })).not.toBeInTheDocument();
    view.rerender(<StudentHome user={mirko} dashboard={dashboard([mission(1, { completed: true }), mission(2, { completed: true }), mission(3, { unlocked: true })])} onMission={vi.fn()} onSettings={vi.fn()} onRobotDefense={onRobotDefense} />);
    expect(within(screen.getByRole('article', { name: /Mission 2:/i })).getByRole('button', { name: /Train Reinforcements/i })).toBeInTheDocument();
    expect(within(screen.getByRole('article', { name: /Mission 3:/i })).queryByRole('button', { name: /Train Robot Override/i })).not.toBeInTheDocument();
  });
  it('uses the Screen 2 command deck with Echo and asynchronous RGB glass panels', () => {
    const identity = { ...emptyProgression(), hackerIdentityUnlocked: true, hackerCodename: 'ECHO', completedMissions: [1, 2, 3] };
    const view = render(<StudentHome user={testHacker} dashboard={{ ...dashboard([
      mission(1, { unlocked: true, completed: true }),
      mission(2, { unlocked: true }),
      mission(3),
      mission(4),
    ]), progression: identity }} onMission={vi.fn()} onSettings={vi.fn()} />);

    expect(screen.getByRole('main', { name: /Cyber Hero Home Base/i })).toHaveClass('cyber-home');
    expect(screen.getByRole('img', { name: /Echo cyber-wolf operative/i })).toHaveAttribute('src', expect.stringContaining('echo-cyber-wolf.png'));
    expect(screen.getByRole('heading', { level: 1, name: 'ECHO' })).toBeInTheDocument();
    expect(screen.getByText('CAMPAIGN PROGRESSION NETWORK')).toBeInTheDocument();
    expect(view.container.querySelectorAll('[data-rgb-pattern]')).toHaveLength(7);
    expect([...view.container.querySelectorAll('[data-rgb-pattern]')].map((node) => node.getAttribute('data-rgb-pattern'))).toEqual([
      'echo-orbit', 'launch-reverse', 'training-orbit', 'supply-reverse', 'mission-wave', 'campaign-diagonal', 'system-wave',
    ]);
  });

  it('uses the anonymous cadet portrait without revealing a student identity', () => {
    render(<StudentHome user={mirko} dashboard={{
      ...dashboard([mission(1), mission(2), mission(3)]),
      progression: emptyProgression(),
    }} onMission={vi.fn()} onSettings={vi.fn()} />);

    expect(screen.getByRole('img', { name: /Anonymous cadet/i })).toHaveAttribute('src', expect.stringContaining('anonymous-cadet.png'));
    expect(screen.queryByRole('img', { name: /cyber-wolf operative/i })).not.toBeInTheDocument();
    expect(screen.queryByText('ECHO')).not.toBeInTheDocument();
    expect(screen.queryByText('ANONYMOUS')).not.toBeInTheDocument();
    expect(screen.queryByText(/Welcome back, (Rookie|Mirko)/i)).not.toBeInTheDocument();
    expect(screen.getByText('IDENTITY PENDING')).toBeInTheDocument();
    expect(screen.getByText('Complete three Rookie Missions to create your hacker identity.')).toBeInTheDocument();
  });

  it('launches the current available operation from the Screen 2 hero action', () => {
    const onMission = vi.fn();
    render(<StudentHome user={testHacker} dashboard={dashboard([
      mission(1, { unlocked: true, completed: true }),
      mission(2, { unlocked: true }),
      mission(3),
      mission(4),
    ])} onMission={onMission} onSettings={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Start Mission 2/i }));
    expect(onMission).toHaveBeenCalledWith('mission-2');
  });

  it('shows one available mission and three locked missions for a new student', () => {
    render(<StudentHome user={mirko} dashboard={dashboard([mission(1), mission(2), mission(3)])} onMission={vi.fn()} onSettings={vi.fn()} />);
    expect(screen.getAllByRole('article')).toHaveLength(8);
    expect(screen.getByText('NEW SIGNAL')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: /Campaign progress/i })).toHaveAttribute('aria-valuenow', '0');
    expect(within(screen.getByRole('region', { name: 'Training missions' })).getByRole('button', { name: /Start Mission/i })).toBeInTheDocument();
    expect(screen.getAllByText('Locked')).toHaveLength(7);
    expect(screen.queryByRole('button', { name: /Replay/i })).not.toBeInTheDocument();
  });

  it('shows per-mission personal bests and replays completed missions', () => {
    const onMission = vi.fn();
    render(<StudentHome user={mirko} dashboard={dashboard([
      mission(1, { unlocked: true, completed: true, bestScore: 820, bestTimeSeconds: 52, totalPoints: 1450, attemptCount: 2 }),
      mission(2, { unlocked: true }), mission(3),
    ])} onMission={onMission} onSettings={vi.fn()} />);
    const first = screen.getByRole('article', { name: /Mission 1/i });
    expect(within(first).getByText('820 pts')).toBeInTheDocument();
    expect(within(first).getByText('0:52')).toBeInTheDocument();
    fireEvent.click(within(first).getByRole('button', { name: /Replay/i }));
    expect(onMission).toHaveBeenCalledWith('mission-1');
    expect(within(screen.getByRole('region', { name: 'Training missions' })).getByRole('button', { name: /Start Mission/i })).toBeInTheDocument();
  });

  it('shows Mission 4 as an available operator mission after all three rookie missions', () => {
    render(<StudentHome user={mirko} dashboard={dashboard([
      ...[1, 2, 3].map((number) => mission(number, { unlocked: true, completed: true, bestScore: 900, bestTimeSeconds: 50 })),
      mission(4, { unlocked: true }),
    ])} onMission={vi.fn()} onSettings={vi.fn()} />);
    const fourth = screen.getByRole('article', { name: /Mission 4: Emergency Relocation/i });
    expect(within(fourth).getByText('OPERATOR')).toBeInTheDocument();
    expect(within(fourth).getByText('Available now')).toBeInTheDocument();
    expect(within(fourth).getByRole('button', { name: /Open briefing/i })).toBeInTheDocument();
  });

  it('shows aggregate Training Center status and enables it only after a module unlocks', () => {
    const locked = dashboard([mission(1), mission(2), mission(3)]);
    const onTraining = vi.fn();
    const view = render(<StudentHome user={mirko} dashboard={{ ...locked, completedMissions: [], training: [training({ unlocked: false })] }} onMission={vi.fn()} onSettings={vi.fn()} onTraining={onTraining} />);
    const trainingCard = screen.getByRole('region', { name: /Training Center status/i });
    expect(trainingCard).toHaveClass('is-locked');
    expect(within(trainingCard).getByRole('button', { name: /Open Training Center/i })).toBeDisabled();
    expect(within(trainingCard).getByText(/Training modules unlock through the campaign/i)).toBeInTheDocument();

    view.rerender(<StudentHome user={mirko} dashboard={{ ...locked, completedMissions: [1,2,3], training: [training({ unlocked: true, creditsEarned: 7 })] }} onMission={vi.fn()} onSettings={vi.fn()} onTraining={onTraining} />);
    expect(trainingCard).not.toHaveClass('is-locked');
    expect(screen.getByText('5 modules available')).toBeInTheDocument();
    expect(screen.getByText('5 moduli disponibili')).toHaveAttribute('lang', 'it');
    expect(within(screen.getByRole('region', { name: /Training Center status/i })).getByText('5 moduli disponibili')).toHaveAttribute('lang', 'it');
    expect(screen.getByText('Apri il Centro di addestramento')).toHaveAttribute('lang', 'it');
    expect(screen.getByText('7 / 20 Credits')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: /Training Credits/i })).toHaveAttribute('aria-valuenow', '7');
    const openBtn = screen.getByRole('button', { name: /Open Training Center/i });
    expect(openBtn).toBeEnabled();
    fireEvent.click(openBtn);
    expect(onTraining).toHaveBeenCalledOnce();
  });

  it('greys out and disables Cyber Shop for cadets with fewer than 3 completed missions', () => {
    const onShop = vi.fn();
    const { rerender } = render(<StudentHome user={mirko} dashboard={{ ...dashboard([mission(1)]), completedMissions: [] }} onMission={vi.fn()} onSettings={vi.fn()} onShop={onShop} />);
    const shopRegion = screen.getByRole('region', { name: /Cyber Shop status/i });
    expect(shopRegion).toHaveClass('is-locked');
    expect(within(shopRegion).getByRole('button', { name: /Open Cyber Shop/i })).toBeDisabled();
    expect(within(shopRegion).getByText(/Shop unlocks after completing Mission 3/i)).toBeInTheDocument();
    fireEvent.click(within(shopRegion).getByRole('button', { name: /Open Cyber Shop/i }));
    expect(onShop).not.toHaveBeenCalled();

    // After completing 3 missions, Cyber Shop unlocks
    rerender(<StudentHome user={mirko} dashboard={{ ...dashboard([mission(1, { completed: true }), mission(2, { completed: true }), mission(3, { completed: true })]), completedMissions: [1, 2, 3] }} onMission={vi.fn()} onSettings={vi.fn()} onShop={onShop} />);
    expect(shopRegion).not.toHaveClass('is-locked');
    const shopButton = within(shopRegion).getByRole('button', { name: /Open Cyber Shop/i });
    expect(shopButton).toBeEnabled();
    fireEvent.click(shopButton);
    expect(onShop).toHaveBeenCalledOnce();
  });

  it('opens the Training Center for Base Defense immediately after Mission 1', () => {
    const onTraining = vi.fn();
    const state = dashboard([mission(1, { unlocked: true, completed: true }), mission(2, { unlocked: true }), mission(3)]);
    render(<StudentHome user={mirko} dashboard={{ ...state, completedMissions: [1], training: [] }} onMission={vi.fn()} onSettings={vi.fn()} onTraining={onTraining} />);
    expect(screen.getByText('1 READY')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Open Training Center/i }));
    expect(onTraining).toHaveBeenCalledOnce();
  });

  it('renders the current mission launch button beside the player name in all accounts', () => {
    // 1. Cadet account (Identity Pending)
    const { container: cadetView } = render(<StudentHome user={mirko} dashboard={dashboard([mission(1)])} onMission={vi.fn()} onSettings={vi.fn()} />);
    const cadetHeader = cadetView.querySelector('.echo-header-row')!;
    expect(cadetHeader).toBeInTheDocument();
    expect(within(cadetHeader as HTMLElement).getByText('IDENTITY PENDING')).toBeInTheDocument();
    expect(within(cadetHeader as HTMLElement).getByText(/MISSION 01 · Computer Training/)).toBeInTheDocument();
    expect(within(cadetHeader as HTMLElement).getByRole('button', { name: /Start Mission/i })).toBeInTheDocument();

    // 2. Operative account (ECHO)
    const identity = { ...emptyProgression(), hackerIdentityUnlocked: true, hackerCodename: 'ECHO', completedMissions: [1, 2, 3] };
    const { container: echoView } = render(<StudentHome user={testHacker} dashboard={{ ...dashboard([mission(1, { completed: true }), mission(2, { completed: true }), mission(3, { completed: true }), mission(4, { unlocked: true })]), progression: identity }} onMission={vi.fn()} onSettings={vi.fn()} />);
    const echoHeader = echoView.querySelector('.echo-header-row')!;
    expect(echoHeader).toBeInTheDocument();
    expect(within(echoHeader as HTMLElement).getByRole('heading', { level: 1, name: 'ECHO' })).toBeInTheDocument();
    expect(within(echoHeader as HTMLElement).getByText(/MISSION 04 · Emergency Relocation/)).toBeInTheDocument();
    expect(within(echoHeader as HTMLElement).getByRole('button', { name: /Start Mission/i })).toBeInTheDocument();
  });

  it('renders quick utilities (Training Center and Cyber Shop) directly under readouts for all accounts', () => {
    // Cadet
    const { container: cadetContainer } = render(<StudentHome user={mirko} dashboard={dashboard([mission(1)])} onMission={vi.fn()} onSettings={vi.fn()} />);
    const cadetQuick = cadetContainer.querySelector('.echo-command .echo-quick-utilities');
    expect(cadetQuick).toBeInTheDocument();
    expect(within(cadetQuick as HTMLElement).getByRole('region', { name: /Training Center status/i })).toBeInTheDocument();
    expect(within(cadetQuick as HTMLElement).getByRole('region', { name: /Cyber Shop status/i })).toBeInTheDocument();

    // Operative
    const identity = { ...emptyProgression(), hackerIdentityUnlocked: true, hackerCodename: 'ECHO', completedMissions: [1, 2, 3] };
    const { container: echoContainer } = render(<StudentHome user={testHacker} dashboard={{ ...dashboard([mission(1, { completed: true }), mission(2, { completed: true }), mission(3, { completed: true })]), progression: identity, completedMissions: [1, 2, 3] }} onMission={vi.fn()} onSettings={vi.fn()} />);
    const echoQuick = echoContainer.querySelector('.echo-command .echo-quick-utilities');
    expect(echoQuick).toBeInTheDocument();
    expect(within(echoQuick as HTMLElement).getByRole('region', { name: /Training Center status/i })).toBeInTheDocument();
    expect(within(echoQuick as HTMLElement).getByRole('region', { name: /Cyber Shop status/i })).toBeInTheDocument();
  });

  it('renders all 7 equipment slots in Cyber Shop and eliminates the redundant second profile shop', () => {
    // 1. Cadet account (locked shop still displays all 7 equipment slots with DEFAULT, no second shop)
    const { container: cadetContainer } = render(<StudentHome user={mirko} dashboard={dashboard([mission(1)])} onMission={vi.fn()} onSettings={vi.fn()} />);
    const cadetShop = within(cadetContainer).getByRole('region', { name: /Cyber Shop status/i });
    expect(cadetShop).toHaveClass('is-locked');
    fireEvent.click(within(cadetShop).getByText('YOUR GEAR'));
    const cadetLoadout = within(cadetShop).getByRole('region', { name: /Equipped loadout/i });
    expect(within(cadetLoadout).getByText('HERO')).toBeInTheDocument();
    expect(within(cadetLoadout).getByText('BADGE')).toBeInTheDocument();
    expect(within(cadetLoadout).getByText('CURSOR')).toBeInTheDocument();
    expect(within(cadetLoadout).getByText('MOUSE EFFECT')).toBeInTheDocument();
    expect(within(cadetLoadout).getByText('MOUSE ANIMATION')).toBeInTheDocument();
    expect(within(cadetLoadout).getByText('TERMINAL THEME')).toBeInTheDocument();
    expect(within(cadetLoadout).getByText('COMPANION')).toBeInTheDocument();
    expect(cadetContainer.querySelector('.hacker-profile')).not.toBeInTheDocument();

    // 2. Operative account with custom items equipped
    const identity = {
      ...emptyProgression(),
      hackerIdentityUnlocked: true,
      hackerCodename: 'ECHO',
      completedMissions: [1, 2, 3],
      equippedItems: {
        cursor: 'neon-pointer',
        terminalTheme: 'matrix-terminal',
      },
    };
    const { container: echoContainer } = render(
      <StudentHome
        user={testHacker}
        dashboard={{
          ...dashboard([
            mission(1, { completed: true }),
            mission(2, { completed: true }),
            mission(3, { completed: true }),
            mission(4, { unlocked: true }),
          ]),
          progression: identity,
          completedMissions: [1, 2, 3],
        }}
        onMission={vi.fn()}
        onSettings={vi.fn()}
      />
    );
    const echoShop = within(echoContainer).getByRole('region', { name: /Cyber Shop status/i });
    expect(echoShop).not.toHaveClass('is-locked');
    fireEvent.click(within(echoShop).getByText('YOUR GEAR'));
    const echoLoadout = within(echoShop).getByRole('region', { name: /Equipped loadout/i });
    expect(within(echoLoadout).getByText(/Neon Pointer/i)).toBeInTheDocument();
    expect(within(echoLoadout).getByText(/Matrix Terminal/i)).toBeInTheDocument();
    // Verify there is no duplicate second shop container or redundant Campaign Access
    expect(echoContainer.querySelector('.hacker-profile')).not.toBeInTheDocument();
    expect(echoContainer.querySelector('.echo-command .profile-progression')).not.toBeInTheDocument();
  });
});

function training(overrides: Partial<TrainingProgress> = {}): TrainingProgress {
  return { trainingId: 'systems-calibration', unlocked: true, completedRuns: 0, rewardedRuns: 0, creditsEarned: 0, creditCap: 20, bestScore: null, bestTimeSeconds: null, bestAccuracy: null, longestStreak: 0, highestRank: null, lastCompletedAt: null, ...overrides };
}
