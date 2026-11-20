import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CommandHeader } from '../components/header/CommandHeader';
import { SimulationResult } from '../types';
import * as api from '../services/api';

const mockBaselineSim: SimulationResult = {
  simulation_id: 'sim_baseline_001',
  timestamp: '2026-11-20T08:00:00Z',
  is_baseline: true,
  disruption: {
    airport_code: 'BOM',
    start_time: '08:00',
    duration_minutes: 0,
    disruption_type: 'None'
  },
  metrics: {
    delayed_flights: 0,
    total_delay_minutes: 0,
    average_delay_minutes: 0.0,
    stranded_passengers: 0,
    missed_connections: 0,
    crew_duty_violations: 0,
    network_health_score: 100.0,
    network_recovery_percentage: 100.0,
    total_cost_inr: 0,
    severity_level: 'NORMAL'
  },
  flights: [],
  connections: [],
  crew: [],
  timeline: [],
  airport_disruption_ranking: [],
  delay_distribution: []
};

describe('CommandHeader Component', () => {
  beforeEach(() => {
    vi.spyOn(api, 'ensureAuthenticated').mockResolvedValue({
      id: 1,
      email: 'dispatcher@dominosky.aoc',
      full_name: 'Senior Operations Dispatcher',
      role: 'DISPATCHER'
    });
  });

  it('renders title, brand identity, and nominal health state', () => {
    render(
      <CommandHeader
        sim={mockBaselineSim}
        onReset={vi.fn()}
        onOpenDispatcher={vi.fn()}
        onOpenHistory={vi.fn()}
        isLoading={false}
      />
    );

    expect(screen.getByText('DOMINO SKY')).toBeInTheDocument();
    expect(screen.getByText('AOC Command Center')).toBeInTheDocument();
    expect(screen.getByText('NOMINAL BASELINE')).toBeInTheDocument();
    expect(screen.getByText('100.0%')).toBeInTheDocument();
  });

  it('renders active RBAC role selector with DISPATCHER selected', async () => {
    render(
      <CommandHeader
        sim={mockBaselineSim}
        onReset={vi.fn()}
        onOpenDispatcher={vi.fn()}
        onOpenHistory={vi.fn()}
        isLoading={false}
      />
    );

    const roleSelect = screen.getByLabelText(/Active User RBAC Role/i);
    expect(roleSelect).toBeInTheDocument();
    expect(roleSelect).toHaveValue('DISPATCHER');
  });

  it('allows switching RBAC role and calls loginAsRole', async () => {
    const loginSpy = vi.spyOn(api, 'loginAsRole').mockResolvedValue({
      id: 2,
      email: 'analyst@dominosky.aoc',
      full_name: 'Optimization Analyst',
      role: 'ANALYST'
    });

    render(
      <CommandHeader
        sim={mockBaselineSim}
        onReset={vi.fn()}
        onOpenDispatcher={vi.fn()}
        onOpenHistory={vi.fn()}
        isLoading={false}
      />
    );

    const roleSelect = screen.getByLabelText(/Active User RBAC Role/i);
    fireEvent.change(roleSelect, { target: { value: 'ANALYST' } });

    await waitFor(() => {
      expect(loginSpy).toHaveBeenCalledWith('ANALYST');
    });
  });

  it('triggers onOpenDispatcher when SKY-MIND button is clicked', () => {
    const handleDispatcher = vi.fn();

    render(
      <CommandHeader
        sim={mockBaselineSim}
        onReset={vi.fn()}
        onOpenDispatcher={handleDispatcher}
        onOpenHistory={vi.fn()}
        isLoading={false}
      />
    );

    const btn = screen.getByRole('button', { name: /SKY-MIND/i });
    fireEvent.click(btn);
    expect(handleDispatcher).toHaveBeenCalledTimes(1);
  });
});
