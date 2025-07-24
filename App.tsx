
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SimulationSettings, Particle, SimulationStatus, ScatterPoint, PathUpdate } from './types';
import Controls from './components/Controls';
import SimulationCanvas from './components/SimulationCanvas';
import AngleDistributionChart from './components/AngleDistributionChart';
import Tooltip from './components/Tooltip';
import { explanations } from './components/explanations';

// Worker code is inlined as a string to avoid pathing issues in virtual environments.
// All TypeScript annotations are removed as this will be executed as plain JavaScript.
const workerCode = `
    const CANVAS_WIDTH = 800;
    const CANVAS_HEIGHT = 600;
    const SCALE = 1e-14;
    const TIME_STEP = 1e-22;
    const K_COULOMB = 8.9875517923e9;
    const ELEMENTARY_CHARGE = 1.602176634e-19;
    const ALPHA_PARTICLE_MASS = 6.6446573357e-27;
    const JOULES_PER_MEV = 1.60218e-13;

    let particles = [];
    let newPathData = {};
    let settings = null;
    let physicsTimer = null;
    let updateTimer = null;
    let isRunning = false;

    const sendUpdate = () => {
        if (!isRunning) return;
        
        const particlePositions = particles.map(p => ({
            id: p.id,
            position: p.position,
            color: p.color
        }));

        self.postMessage({
            type: 'update',
            payload: {
                particles: particlePositions,
                newPaths: newPathData,
            }
        });
        newPathData = {};
    };

    const runSimulationStep = () => {
        if (!isRunning || !settings || particles.length === 0) {
            return;
        }

        let finishedCount = 0;
        particles.forEach(p => {
            if (p.finished) {
                finishedCount++;
                return;
            }

            // Mark as finished if particle is far away from the canvas in any direction
            const boundaryX = CANVAS_WIDTH / 2 + 50;
            const boundaryY = CANVAS_HEIGHT / 2 + 50;
            const particleX = p.position.x / SCALE;
            const particleY = p.position.y / SCALE;

            if (particleX > boundaryX || particleX < -boundaryX || particleY > boundaryY || particleY < -boundaryY) {
                p.finished = true;
                finishedCount++;
                return;
            }

            const rVector = { x: p.position.x, y: p.position.y };
            const rMagnitude = Math.sqrt(rVector.x ** 2 + rVector.y ** 2);

            if (rMagnitude < 1e-15) { 
                p.finished = true;
                finishedCount++;
                return;
            }

            const forceMagnitude = (K_COULOMB * (2 * ELEMENTARY_CHARGE) * (settings.targetZ * ELEMENTARY_CHARGE)) / (rMagnitude ** 2);
            const force = {
                x: forceMagnitude * (rVector.x / rMagnitude),
                y: forceMagnitude * (rVector.y / rMagnitude),
            };

            const acceleration = {
                x: force.x / ALPHA_PARTICLE_MASS,
                y: force.y / ALPHA_PARTICLE_MASS,
            };

            const newVelocity = {
                x: p.velocity.x + acceleration.x * TIME_STEP,
                y: p.velocity.y + acceleration.y * TIME_STEP,
            };

            const newPosition = {
                x: p.position.x + newVelocity.x * TIME_STEP,
                y: p.position.y + newVelocity.y * TIME_STEP,
            };

            p.position = newPosition;
            p.velocity = newVelocity;
            
            p.stepCount = (p.stepCount || 0) + 1;
            if (p.stepCount % 5 === 0) {
                const newPathPoint = {
                    x: newPosition.x / SCALE + CANVAS_WIDTH / 2,
                    y: newPosition.y / SCALE + CANVAS_HEIGHT / 2,
                };
                if (!newPathData[p.id]) {
                    newPathData[p.id] = [];
                }
                newPathData[p.id].push(newPathPoint);
            }
        });

        if (particles.length > 0 && finishedCount === particles.length) {
            isRunning = false;
            if (physicsTimer) clearInterval(physicsTimer);
            if (updateTimer) clearInterval(updateTimer);
            physicsTimer = null;
            updateTimer = null;
            
            // Send final update before finishing
            sendUpdate();

            // Calculate final scatter data and send it
            const scatterData = particles.map(p => {
                const finalVelocity = p.velocity;
                const scatterAngle = Math.abs(Math.atan2(finalVelocity.y, finalVelocity.x) * (180 / Math.PI));
                const impactParameterInFm = p.impactParameter / 1e-15;
                return { x: impactParameterInFm, y: scatterAngle };
            });
            
            self.postMessage({ type: 'finished', payload: { scatterData: scatterData } });
        }
    };

    const stopSimulation = () => {
        isRunning = false;
        if (physicsTimer) {
            clearInterval(physicsTimer);
            physicsTimer = null;
        }
        if (updateTimer) {
            clearInterval(updateTimer);
            updateTimer = null;
        }
    };

    self.onmessage = (e) => {
        const { type, payload } = e.data;

        switch (type) {
            case 'start':
                if (!isRunning) {
                    isRunning = true;
                    if (!physicsTimer) {
                        physicsTimer = setInterval(runSimulationStep, 0);
                    }
                    if (!updateTimer) {
                        updateTimer = setInterval(sendUpdate, 1000 / 60);
                    }
                }
                break;

            case 'pause':
                stopSimulation();
                break;

            case 'reset':
                stopSimulation();
                settings = payload.settings;
                
                let finalParticles = [];
                const initialPaths = {};

                if (settings) {
                    const particleMap = new Map();
                    const initialVelocityX = Math.sqrt((2 * settings.energy * JOULES_PER_MEV) / ALPHA_PARTICLE_MASS);

                    const addParticle = (impactB_pixels) => {
                        const key = impactB_pixels.toFixed(6);
                        if (particleMap.has(key)) return;

                        const particleData = {
                            position: { x: -CANVAS_WIDTH / 2 * SCALE, y: impactB_pixels * SCALE },
                            velocity: { x: initialVelocityX, y: 0 },
                            impactParameterInPixels: impactB_pixels,
                            impactParameter: Math.abs(impactB_pixels * SCALE),
                            stepCount: 0,
                            finished: false,
                        };
                        particleMap.set(key, particleData);
                    };

                    if (settings.isFocusModeEnabled) {
                        for (let i = 1; i <= 150; i++) {
                            const impactInMeters = i * 1e-15;
                            const impactInPixels = impactInMeters / SCALE;
                            addParticle(impactInPixels);
                            addParticle(-impactInPixels);
                        }
                    }

                    const numStandardParticles = settings.numParticles;
                    const halfNum = Math.floor(numStandardParticles / 2);
                    const impactStep = halfNum > 0 ? (CANVAS_HEIGHT / 2 * 0.8) / halfNum : 0;
                    for (let i = 0; i < numStandardParticles; i++) {
                        const stepIndex = Math.floor(i / 2) + 1;
                        const sign = (i % 2 === 0 ? 1 : -1);
                        const impactB_pixels = impactStep > 0 ? stepIndex * impactStep * sign : 0;
                        addParticle(impactB_pixels);
                    }

                    const a_finalParticles = Array.from(particleMap.values());
                    const finalNumParticles = a_finalParticles.length;

                    a_finalParticles.forEach((p, index) => {
                        p.id = index;
                        p.color = \`hsl(\${(index * 360) / finalNumParticles}, 90%, 70%)\`;
                        
                        const initialCanvasPos = { x: 0, y: CANVAS_HEIGHT / 2 + p.impactParameterInPixels };
                        initialPaths[p.id] = [initialCanvasPos];
                        delete p.impactParameterInPixels;
                    });

                    finalParticles = a_finalParticles;
                }
                
                particles = finalParticles;
                newPathData = {};

                self.postMessage({ type: 'resetComplete', payload: { particles: finalParticles, initialPaths: initialPaths } });
                break;
        }
    };
`;

const App: React.FC = () => {
    const [settings, setSettings] = useState<SimulationSettings>({
        energy: 5,
        numParticles: 50,
        targetZ: 79,
        isFocusModeEnabled: false,
    });
    // Particle state is now lightweight, without the 'path' property
    const [particles, setParticles] = useState<Omit<Particle, 'path'>[]>([]);
    const [status, setStatus] = useState<SimulationStatus>('idle');
    const [scatterData, setScatterData] = useState<ScatterPoint[]>([]);
    const [newPaths, setNewPaths] = useState<PathUpdate>({});
    const [simulationId, setSimulationId] = useState(0);

    const workerRef = useRef<Worker | null>(null);

    useEffect(() => {
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        const worker = new Worker(workerUrl);
        workerRef.current = worker;

        worker.onmessage = (e: MessageEvent<{ type: string, payload?: any }>) => {
            const { type, payload } = e.data;
            switch (type) {
                case 'update':
                    if (payload) {
                        setParticles(payload.particles);
                        if (Object.keys(payload.newPaths).length > 0) {
                            setNewPaths(payload.newPaths);
                        }
                    }
                    break;
                case 'finished':
                    setStatus('paused');
                    if (payload && payload.scatterData) {
                       setScatterData(payload.scatterData);
                    }
                    break;
                case 'resetComplete':
                    if (payload) {
                        setStatus('idle');
                        setSimulationId(id => id + 1); // Signal to canvas that a reset happened
                        setParticles(payload.particles);
                        setNewPaths(payload.initialPaths);
                        setScatterData([]);
                    }
                    break;
            }
        };

        return () => {
            worker.terminate();
            URL.revokeObjectURL(workerUrl);
        };
    }, []);

    const resetSimulation = useCallback(() => {
        if (workerRef.current) {
            workerRef.current.postMessage({ type: 'reset', payload: { settings } });
        }
    }, [settings]);

    useEffect(() => {
        resetSimulation();
    }, [resetSimulation]);
    
    const handleStart = () => {
        workerRef.current?.postMessage({ type: 'start' });
        setStatus('running');
    };
    const handleStop = () => {
        workerRef.current?.postMessage({ type: 'pause' });
        setStatus('paused');
    };
    const handleReset = () => {
        resetSimulation();
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 font-sans">
            <header className="w-full max-w-7xl text-center mb-4">
                <div className="flex items-center justify-center gap-3">
                    <h1 className="text-4xl font-bold text-cyan-400">러더퍼드 산란 시뮬레이터</h1>
                    <Tooltip 
                        title={explanations.simulationTitle.title} 
                        content={explanations.simulationTitle.content} 
                        position="bottom"
                    />
                </div>
                <p className="text-gray-400 mt-1">원자핵에 쏘아진 알파입자의 운동</p>
            </header>
            
            <main className="w-full max-w-7xl flex flex-col lg:flex-row gap-6">
                <div className="flex-1 flex flex-col gap-6">
                    <SimulationCanvas 
                        particles={particles} 
                        targetZ={settings.targetZ}
                        newPaths={newPaths}
                        simulationId={simulationId}
                    />
                    <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
                        <h2 className="text-xl font-semibold mb-4 text-cyan-400 text-center">산란각 vs 충돌 계수</h2>
                         <AngleDistributionChart data={scatterData} />
                    </div>
                </div>

                <aside className="w-full lg:w-80 flex-shrink-0">
                    <div className="bg-gray-800 p-4 rounded-lg shadow-lg sticky top-4">
                        <Controls 
                            settings={settings} 
                            setSettings={setSettings}
                            status={status}
                            onStart={handleStart}
                            onStop={handleStop}
                            onReset={handleReset}
                        />
                    </div>
                </aside>
            </main>
        </div>
    );
};

export default App;