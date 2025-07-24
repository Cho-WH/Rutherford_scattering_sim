
export interface Vector2D {
    x: number;
    y: number;
}

export interface Particle {
    id: number;
    position: Vector2D;
    velocity: Vector2D;
    path?: Vector2D[]; // Path is now optional as it's not stored everywhere
    color: string;
    impactParameter: number; // in meters
}

export interface SimulationSettings {
    energy: number; // in MeV
    numParticles: number;
    targetZ: number; // Atomic number of the target nucleus
    isFocusModeEnabled: boolean;
}

export type SimulationStatus = 'idle' | 'running' | 'paused';

export interface ScatterPoint {
    /** Impact parameter in femtometers (fm). */
    x: number;
    /** Scattering angle in degrees (°). */
    y: number;
}

export interface PathUpdate {
    [particleId: number]: Vector2D[];
}