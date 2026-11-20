import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DisruptionControlPanel } from '../components/disruption/DisruptionControlPanel';
import { Airport } from '../types';

const mockAirports: Airport[] = [
  {
    code: 'BOM',
    name: 'Chhatrapati Shivaji Maharaj International',
    city: 'Mumbai',
    state: 'Maharashtra',
    latitude: 19.0896,
    longitude: 72.8656,
    is_hub: true,
    capacity_per_hour: 45,
    min_turnaround_time: 45,
    icao: 'VABB'
  },
  {
    code: 'DEL',
    name: 'Indira Gandhi International Airport',
    city: 'Delhi',
    state: 'Delhi',
    latitude: 28.5562,
    longitude: 77.1000,
    is_hub: true,
    capacity_per_hour: 50,
    min_turnaround_time: 45,
    icao: 'VIDP'
  }
];

describe('DisruptionControlPanel Component', () => {
  it('renders airport and disruption controls correctly', () => {
    const handleInitiate = vi.fn();
    const handleReset = vi.fn();

    render(
      <DisruptionControlPanel
        airports={mockAirports}
        onInitiate={handleInitiate}
        onReset={handleReset}
        isLoading={false}
      />
    );

    expect(screen.getByText(/Airport Disruption Simulator/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Select target airport/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Select disruption cause/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Closure start time/i)).toBeInTheDocument();
  });

  it('allows user to change target airport and duration preset', async () => {
    const handleInitiate = vi.fn();
    const handleReset = vi.fn();

    render(
      <DisruptionControlPanel
        airports={mockAirports}
        onInitiate={handleInitiate}
        onReset={handleReset}
        isLoading={false}
      />
    );

    // Select DEL airport
    const airportSelect = screen.getByLabelText(/Select target airport/i);
    fireEvent.change(airportSelect, { target: { value: 'DEL' } });
    expect(airportSelect).toHaveValue('DEL');

    // Click 120m duration preset
    const preset120 = screen.getByRole('button', { name: '120m' });
    fireEvent.click(preset120);
    expect(screen.getByText('120 MIN')).toBeInTheDocument();
  });

  it('triggers onInitiate with deterministic parameters on form submit', () => {
    const handleInitiate = vi.fn();
    const handleReset = vi.fn();

    render(
      <DisruptionControlPanel
        airports={mockAirports}
        onInitiate={handleInitiate}
        onReset={handleReset}
        isLoading={false}
      />
    );

    // Submit disruption
    const submitBtn = screen.getByRole('button', { name: /INITIATE DISRUPTION/i });
    fireEvent.click(submitBtn);

    expect(handleInitiate).toHaveBeenCalledTimes(1);
    expect(handleInitiate).toHaveBeenCalledWith(
      expect.objectContaining({
        airport_code: 'BOM',
        start_time: '08:00',
        duration_minutes: 90,
        disruption_type: 'Thunderstorm'
      })
    );
  });

  it('triggers onReset when Reset button is clicked', () => {
    const handleInitiate = vi.fn();
    const handleReset = vi.fn();

    render(
      <DisruptionControlPanel
        airports={mockAirports}
        onInitiate={handleInitiate}
        onReset={handleReset}
        isLoading={false}
      />
    );

    const resetBtn = screen.getByRole('button', { name: /Reset/i });
    fireEvent.click(resetBtn);
    expect(handleReset).toHaveBeenCalledTimes(1);
  });
});
