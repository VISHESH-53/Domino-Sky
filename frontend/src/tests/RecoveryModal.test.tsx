import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecoveryComparisonModal } from '../components/recovery/RecoveryComparisonModal';
import { RecoveryComparison } from '../types';

const mockComparison: RecoveryComparison = {
  before_simulation_id: 'sim_before_123',
  after_simulation_id: 'sim_after_456',
  delay_reduction_minutes: 180,
  stranded_passengers_saved: 42,
  crew_violations_prevented: 2,
  cost_saved_inr: 850000,
  before_metrics: {
    delayed_flights: 12,
    total_delay_minutes: 420,
    average_delay_minutes: 35.0,
    stranded_passengers: 84,
    missed_connections: 18,
    crew_duty_violations: 3,
    network_health_score: 68.5,
    network_recovery_percentage: 45.0,
    total_cost_inr: 2500000,
    severity_level: 'HIGH'
  },
  after_metrics: {
    delayed_flights: 5,
    total_delay_minutes: 240,
    average_delay_minutes: 20.0,
    stranded_passengers: 42,
    missed_connections: 8,
    crew_duty_violations: 1,
    network_health_score: 88.0,
    network_recovery_percentage: 82.5,
    total_cost_inr: 1650000,
    severity_level: 'LOW'
  },
  applied_action: {
    action_id: 'swap_VT_SPARE_1',
    strategy_type: 'SPARE_DEPLOYMENT',
    title: 'Deploy Spare Aircraft VT-X01 at BOM',
    description: 'Substitutes disrupted rotation with hot-standby spare aircraft.',
    affected_flights: ['DS-102', 'DS-103'],
    aircraft_used: ['VT-X01'],
    delay_reduction_minutes: 180,
    stranded_passengers_saved: 42,
    crew_violations_prevented: 2,
    estimated_cost_inr: 250000,
    confidence_score: 0.94,
    feasibility_status: 'FEASIBLE'
  }
};

describe('RecoveryComparisonModal Component', () => {
  it('renders before-and-after comparison table and metrics correctly', () => {
    const handleClose = vi.fn();

    render(
      <RecoveryComparisonModal
        comparison={mockComparison}
        onClose={handleClose}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/RECOVERY SIMULATION COMPLETE/i)).toBeInTheDocument();
    expect(screen.getByText(/Deploy Spare Aircraft VT-X01 at BOM/i)).toBeInTheDocument();
    expect(screen.getAllByText(/180/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('42').length).toBeGreaterThanOrEqual(1); // Stranded passengers saved
    expect(screen.getByText('Delayed Flights')).toBeInTheDocument();
  });

  it('has accessible dialog role and aria attributes', () => {
    const handleClose = vi.fn();

    render(
      <RecoveryComparisonModal
        comparison={mockComparison}
        onClose={handleClose}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'recovery-modal-title');
  });

  it('calls onClose when close button or accept button is clicked', () => {
    const handleClose = vi.fn();

    render(
      <RecoveryComparisonModal
        comparison={mockComparison}
        onClose={handleClose}
      />
    );

    const closeBtn = screen.getByLabelText(/Close recovery comparison modal/i);
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    const acceptBtn = screen.getByRole('button', { name: /Accept & Return to Dashboard/i });
    fireEvent.click(acceptBtn);
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('dismisses modal when Escape key is pressed', () => {
    const handleClose = vi.fn();

    render(
      <RecoveryComparisonModal
        comparison={mockComparison}
        onClose={handleClose}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
