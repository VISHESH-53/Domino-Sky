import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NetworkMap } from '../components/network-map/NetworkMap';
import { Airport, RouteNetworkItem, SimulationResult } from '../types';

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

const mockRoutes: RouteNetworkItem[] = [
  {
    origin: 'BOM',
    destination: 'DEL',
    origin_coords: [19.0896, 72.8656],
    destination_coords: [28.5562, 77.1000],
    flight_count: 5,
    has_delayed_flights: false
  }
];

const mockSim: SimulationResult = {
  simulation_id: 'sim_test_001',
  timestamp: '2026-11-20T08:00:00Z',
  is_baseline: false,
  disruption: {
    airport_code: 'BOM',
    start_time: '08:00',
    duration_minutes: 90,
    disruption_type: 'Thunderstorm'
  },
  metrics: {
    delayed_flights: 8,
    total_delay_minutes: 320,
    average_delay_minutes: 40.0,
    stranded_passengers: 48,
    missed_connections: 12,
    crew_duty_violations: 2,
    network_health_score: 74.0,
    network_recovery_percentage: 50.0,
    total_cost_inr: 1200000,
    severity_level: 'HIGH'
  },
  flights: [
    {
      flight_id: 'DS-101',
      origin: 'BOM',
      destination: 'DEL',
      scheduled_departure: '08:15',
      scheduled_arrival: '10:30',
      actual_departure: '09:45',
      actual_arrival: '12:00',
      departure_delay_minutes: 90,
      arrival_delay_minutes: 90,
      assigned_aircraft: 'VT-ABC',
      status: 'DELAYED',
      is_delayed: true,
      delay_reasons: ['Airport Closure: BOM Thunderstorm (90m)']
    }
  ],
  connections: [],
  crew: [],
  timeline: [],
  airport_disruption_ranking: [
    {
      code: 'BOM',
      name: 'Mumbai',
      total_delay_minutes: 320,
      delayed_departures: 5,
      delayed_arrivals: 3,
      cancelled_flights: 0,
      affected_passengers: 48,
      severity: 'CRITICAL'
    }
  ],
  delay_distribution: []
};

describe('NetworkMap Accessibility & Interaction', () => {
  it('renders SVG map and airport nodes with accessible roles and labels', () => {
    render(
      <NetworkMap
        airports={mockAirports}
        routes={mockRoutes}
        sim={mockSim}
      />
    );

    const bomNode = screen.getByLabelText(/Airport Chhatrapati Shivaji Maharaj International \(BOM\)/i);
    expect(bomNode).toBeInTheDocument();
    expect(bomNode).toHaveAttribute('role', 'button');

    const delNode = screen.getByLabelText(/Airport Indira Gandhi International Airport \(DEL\)/i);
    expect(delNode).toBeInTheDocument();
    expect(delNode).toHaveAttribute('role', 'button');
  });

  it('opens airport detail drawer when Enter key is pressed on focused airport node', () => {
    render(
      <NetworkMap
        airports={mockAirports}
        routes={mockRoutes}
        sim={mockSim}
      />
    );

    const bomNode = screen.getByLabelText(/Airport Chhatrapati Shivaji Maharaj International \(BOM\)/i);
    fireEvent.keyDown(bomNode, { key: 'Enter', code: 'Enter' });

    // Drawer opens
    const drawer = screen.getByRole('dialog', { name: /Airport Details for Chhatrapati Shivaji Maharaj International/i });
    expect(drawer).toBeInTheDocument();
    expect(screen.getByText('TOTAL FLIGHTS')).toBeInTheDocument();
    expect(screen.getByText('DS-101')).toBeInTheDocument();
  });

  it('closes airport detail drawer when Escape key is pressed', () => {
    render(
      <NetworkMap
        airports={mockAirports}
        routes={mockRoutes}
        sim={mockSim}
      />
    );

    // Open BOM
    const bomNode = screen.getByLabelText(/Airport Chhatrapati Shivaji Maharaj International \(BOM\)/i);
    fireEvent.click(bomNode);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
