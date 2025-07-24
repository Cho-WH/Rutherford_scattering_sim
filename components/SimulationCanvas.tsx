
import React, { useLayoutEffect, useRef, useMemo } from 'react';
import { Particle, PathUpdate } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, NUCLEUS_RADIUS_BASE, SCALE } from '../constants';

interface SimulationCanvasProps {
    particles: Omit<Particle, 'path'>[];
    targetZ: number;
    newPaths: PathUpdate;
    simulationId: number;
}

const SimulationCanvas: React.FC<SimulationCanvasProps> = ({ particles, targetZ, newPaths, simulationId }) => {
    const nucleusRadiusInMeters = NUCLEUS_RADIUS_BASE * Math.cbrt(targetZ);
    const nucleusRadiusOnCanvas = Math.max(5, nucleusRadiusInMeters / SCALE);
    
    const pathGroupRef = useRef<SVGGElement>(null);
    const polylinesRef = useRef<Record<number, SVGPolylineElement>>({});
    const lastSimulationIdRef = useRef<number | null>(null);

    // Create a memoized map for efficient color lookup to solve O(n^2) problem
    const colorMap = useMemo(() => {
        return new Map(particles.map(p => [p.id, p.color]));
    }, [particles]);

    useLayoutEffect(() => {
        const group = pathGroupRef.current;
        if (!group) return;

        // On reset, clear all previously rendered paths
        if (simulationId !== lastSimulationIdRef.current) {
            group.innerHTML = '';
            polylinesRef.current = {};
            lastSimulationIdRef.current = simulationId;
        }

        // Append new path segments received from the worker
        for (const idStr in newPaths) {
            const id = Number(idStr);
            const pointsToAdd = newPaths[id];
            if (!pointsToAdd || pointsToAdd.length === 0) continue;

            let polyline = polylinesRef.current[id];
            
            // If polyline doesn't exist, create it
            if (!polyline) {
                const color = colorMap.get(id); // O(1) lookup, massive performance gain
                if (!color) continue; 

                polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
                polyline.setAttribute('fill', 'none');
                polyline.setAttribute('stroke', color);
                polyline.setAttribute('stroke-width', '1.5');
                polyline.setAttribute('stroke-opacity', '0.7');
                group.appendChild(polyline);
                polylinesRef.current[id] = polyline;
            }
            
            // Efficiently append new points to the existing polyline
            const newPointsString = pointsToAdd.map(p => `${p.x},${p.y}`).join(' ');
            const existingPoints = polyline.getAttribute('points') || '';
            polyline.setAttribute('points', existingPoints ? `${existingPoints} ${newPointsString}` : newPointsString);
        }

    }, [newPaths, simulationId, colorMap]);

    return (
        <div className="bg-black rounded-lg shadow-lg overflow-hidden border-2 border-gray-700">
            <svg width="100%" viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}>
                {/* Background with a subtle grid */}
                <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(55, 65, 81, 0.5)" strokeWidth="1"/>
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />

                {/* Container for manually managed particle paths */}
                <g ref={pathGroupRef} />

                {/* Particles (current position) - managed by React */}
                {particles.map(p => {
                    const canvasPos = {
                        x: p.position.x / SCALE + CANVAS_WIDTH / 2,
                        y: p.position.y / SCALE + CANVAS_HEIGHT / 2
                    };
                    // Only render particle circles if they are inside the canvas
                    if (canvasPos.x >= 0 && canvasPos.x <= CANVAS_WIDTH && canvasPos.y >= 0 && canvasPos.y <= CANVAS_HEIGHT) {
                        return (
                           <circle
                            key={`particle-${p.id}`}
                            cx={canvasPos.x}
                            cy={canvasPos.y}
                            r="3"
                            fill={p.color}
                        />
                        );
                    }
                    return null;
                })}

                {/* Target Nucleus */}
                <circle
                    cx={CANVAS_WIDTH / 2}
                    cy={CANVAS_HEIGHT / 2}
                    r={nucleusRadiusOnCanvas}
                    fill="gold"
                    stroke="yellow"
                    strokeWidth="2"
                />
                 <circle
                    cx={CANVAS_WIDTH / 2}
                    cy={CANVAS_HEIGHT / 2}
                    r={nucleusRadiusOnCanvas + 5}
                    fill="none"
                    stroke="rgba(255, 215, 0, 0.3)"
                    strokeWidth="1"
                />
            </svg>
        </div>
    );
};

export default SimulationCanvas;
