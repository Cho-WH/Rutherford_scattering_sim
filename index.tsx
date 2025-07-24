import React, { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { HelpCircle } from 'lucide-react';
import { Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip as ChartTooltip,
  Legend,
  ChartOptions,
  TooltipItem,
} from 'chart.js';

// --- From types.ts ---
interface Vector2D {
    x: number;
    y: number;
}

interface Particle {
    id: number;
    position: Vector2D;
    velocity: Vector2D;
    path?: Vector2D[];
    color: string;
    impactParameter: number; // in meters
}

interface SimulationSettings {
    energy: number; // in MeV
    numParticles: number;
    targetZ: number; // Atomic number of the target nucleus
    isFocusModeEnabled: boolean;
}

type SimulationStatus = 'idle' | 'running' | 'paused';

interface ScatterPoint {
    x: number; // Impact parameter in femtometers (fm).
    y: number; // Scattering angle in degrees (°).
}

interface PathUpdate {
    [particleId: number]: Vector2D[];
}

// --- From constants.ts ---
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const SCALE = 1e-14; // meters per pixel
const TIME_STEP = 1e-22; // seconds
const K_COULOMB = 8.9875517923e9; // N⋅m²/C²
const ELEMENTARY_CHARGE = 1.602176634e-19; // Coulombs
const ALPHA_PARTICLE_MASS = 6.6446573357e-27; // kg
const JOULES_PER_MEV = 1.60218e-13; // J/MeV
const NUCLEUS_RADIUS_BASE = 1.25e-15; // meters (femtometers)


// --- From components/explanations.tsx ---
const Highlight: React.FC<{children: React.ReactNode}> = ({ children }) => <span className="text-cyan-400 font-semibold">{children}</span>;
const Bold: React.FC<{children: React.ReactNode}> = ({ children }) => <span className="font-bold text-gray-100">{children}</span>;

const explanations = {
    simulationTitle: {
        title: "러더퍼드 산란 시뮬레이션이란?",
        content: (
            <>
                <p>이 시뮬레이션은 20세기 초 물리학의 역사를 바꾼 '러더퍼드 산란 실험'을 재현합니다.</p>
                <p>이 실험 이전, 원자는 (+)전하가 흩어져 있는 '푸딩 모델'로 여겨졌습니다. 하지만 러더퍼드가 금박에 알파 입자를 쏘았을 때, 극소수의 입자가 크게 튕겨 나오는 것을 발견했습니다.</p>
                <p>이를 통해 <Highlight>"원자의 질량과 양전하 대부분은 아주 작은 중심(원자핵)에 모여있다"</Highlight>는 사실을 최초로 증명했습니다. 이 시뮬레이터로 그 위대한 발견의 순간을 직접 확인할 수 있습니다.</p>
            </>
        )
    },
    kineticEnergy: {
        title: "α-입자 운동 에너지",
        content: (
             <>
                <p>알파 입자가 처음 발사될 때 가진 에너지(속도)를 결정합니다.</p>
                <p><Bold>에너지가 높으면 (빠르면)</Bold> 입자는 원자핵의 영향을 적게 받아 경로가 조금만 휘어집니다.</p>
                <p><Bold>에너지가 낮으면 (느리면)</Bold> 원자핵의 영향을 더 오래 받아 경로가 크게 휘어집니다.</p>
            </>
        )
    },
    particleCount: {
        title: "알파 입자 수",
        content: (
            <>
                <p>시뮬레이션에 사용할 총 알파 입자의 개수입니다.</p>
                <p>입자 수가 많을수록 실제 실험과 같이 전체적인 산란 분포를 더 명확하게 관찰할 수 있습니다.</p>
            </>
        )
    },
    targetZ: {
        title: "표적핵 전하량 (Z)",
        content: (
            <>
                <p>표적 원자핵이 가진 양성자의 수, 즉 (+)전하의 세기를 의미합니다. 금(Au)은 Z=79 입니다.</p>
                <p><Bold>Z값이 크면</Bold> 원자핵의 (+)전하가 강해져, 알파 입자를 더욱 세게 밀어냅니다. 이 때문에 산란각이 전반적으로 커집니다.</p>
            </>
        )
    },
    focusMode: {
        title: "원자핵 집중 탐사",
        content: (
            <>
                <p>원자핵 바로 주변, 즉 산란의 비밀이 숨겨진 핵심 영역을 집중적으로 관찰하는 모드입니다.</p>
                <p>이 모드를 켜면, 아주 작은 <Highlight>충돌 계수(1~150fm)</Highlight> 범위에 수백 개의 입자를 정밀하게 발사하여 산란각이 급격하게 변하는 극적인 모습을 관찰할 수 있습니다.</p>
            </>
        )
    },
    impactParameter: {
        title: "충돌 계수 (Impact Parameter, b)",
        content: (
             <>
                <p><Bold>"알파 입자가 얼마나 중심을 벗어나서 조준되었는가"</Bold>를 나타내는 거리입니다. 원자핵 중심과 입자의 초기 경로 사이의 수직 거리입니다.</p>
                <p><Highlight>충돌 계수가 작을수록</Highlight> (정면 충돌) 산란각은 커지고, <Highlight>충돌 계수가 클수록</Highlight> (스쳐 지나감) 산란각은 작아집니다.</p>
            </>
        )
    },
    scatteringAngle: {
        title: "산란각 (Scattering Angle, θ)",
        content: (
            <>
                <p>알파 입자가 원자핵의 전기적 반발력에 의해 원래 경로에서 <Bold>얼마나 휘어졌는지를 나타내는 각도</Bold>입니다.</p>
                <p><Bold>0°</Bold>는 직진, <Bold>180°</Bold>는 정면으로 되튕겨 나왔음을 의미합니다. 러더퍼드는 극소수의 입자만 큰 각도로 산란되는 것을 보고 원자핵 모델을 제안했습니다.</p>
            </>
        )
    }
};

// --- From components/Tooltip.tsx ---
interface TooltipProps {
  title: string;
  content: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const Tooltip: React.FC<TooltipProps> = ({ title, content, position = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={(e) => {
            e.preventDefault();
            setIsVisible(v => !v);
        }}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="text-gray-400 hover:text-cyan-400 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 rounded-full"
        aria-label="도움말 보기"
      >
        <HelpCircle size={16} />
      </button>
      {isVisible && (
        <div
          role="tooltip"
          className={`absolute z-20 w-64 p-3 text-sm font-normal text-gray-200 bg-gray-800 border border-gray-700 rounded-lg shadow-xl ${positionClasses[position]}`}
        >
          <h3 className="font-semibold text-white border-b border-gray-600 pb-2 mb-2">{title}</h3>
          <div className="space-y-2 text-gray-300 leading-relaxed">{content}</div>
        </div>
      )}
    </div>
  );
};

// --- From components/AngleDistributionChart.tsx ---
ChartJS.register(LinearScale, PointElement, LineElement, ChartTooltip, Legend);

interface ChartProps {
    data: ScatterPoint[];
}

const AngleDistributionChart: React.FC<ChartProps> = ({ data }) => {
    const chartData = {
        datasets: [
            {
                label: '입자',
                data: data,
                backgroundColor: '#06b6d4',
                pointRadius: 4,
                pointHoverRadius: 6,
            },
        ],
    };

    const options: ChartOptions<'scatter'> = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                type: 'linear',
                position: 'bottom',
                min: 0,
                max: 2500,
                title: { display: false },
                ticks: { color: '#a0aec0' },
                grid: { color: '#4a5568' },
            },
            y: {
                min: 0,
                max: 180,
                title: { display: false },
                ticks: { color: '#a0aec0', stepSize: 30 },
                grid: { color: '#4a5568' },
            },
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#1a202c',
                titleColor: '#e2e8f0',
                bodyColor: '#e2e8f0',
                borderColor: '#4a5568',
                borderWidth: 1,
                callbacks: {
                    label: function (context: TooltipItem<'scatter'>) {
                        const point = context.raw as ScatterPoint;
                        const xLabel = `충돌 계수: ${point.x.toFixed(2)} fm`;
                        const yLabel = `산란각: ${point.y.toFixed(2)}°`;
                        return [xLabel, yLabel];
                    },
                },
            },
        },
    };

    return (
        <div className="w-full flex" style={{ height: 300 }}>
            <div className="flex items-center justify-center pr-4" style={{ writingMode: 'vertical-rl' }}>
                 <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span>산란각 (°)</span>
                    <div style={{ writingMode: 'horizontal-tb' }}>
                        <Tooltip title={explanations.scatteringAngle.title} content={explanations.scatteringAngle.content} position="right" />
                    </div>
                </div>
            </div>
            <div className="flex-grow flex flex-col min-w-0">
                <div className="flex-grow w-full h-full">
                    <Scatter options={options} data={chartData} />
                </div>
                <div className="flex items-center justify-center pt-3 gap-2 text-sm text-gray-400">
                    <span>충돌 계수 (fm)</span>
                    <Tooltip title={explanations.impactParameter.title} content={explanations.impactParameter.content} />
                </div>
            </div>
        </div>
    );
};


// --- From components/Controls.tsx ---
const Icon: React.FC<{ name: string, className?: string }> = ({ name, className }) => {
    const icons: { [key: string]: React.ReactNode } = {
        play: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
        pause: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4"width="4" height="16"></rect></svg>,
        reset: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v6h6"></path><path d="M3 13a9 9 0 1 0 3-7.7L3 8"></path></svg>,
    };
    return <span className={className}>{icons[name]}</span>;
}

interface ControlsProps {
    settings: SimulationSettings;
    setSettings: React.Dispatch<React.SetStateAction<SimulationSettings>>;
    status: SimulationStatus;
    onStart: () => void;
    onStop: () => void;
    onReset: () => void;
}

const Slider: React.FC<{ label: string; tooltip: {title: string, content: React.ReactNode}; value: number; min: number; max: number; step: number; unit: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ label, tooltip, value, min, max, step, unit, onChange }) => (
    <div className="space-y-2">
        <label className="flex justify-between text-sm font-medium text-gray-300">
            <span className="flex items-center gap-2">
                {label}
                <Tooltip title={tooltip.title} content={tooltip.content} position="top" />
            </span>
            <span className="font-bold text-cyan-400">{value} {unit}</span>
        </label>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={onChange}
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-cyan-500"
        />
    </div>
);

const ToggleSwitch: React.FC<{ label: string; tooltip: {title: string, content: React.ReactNode}; enabled: boolean; onChange: (enabled: boolean) => void }> = ({ label, tooltip, enabled, onChange }) => (
    <div className="flex items-center justify-between py-2">
        <span className="font-medium text-gray-300 flex items-center gap-2">
            {label}
            <Tooltip title={tooltip.title} content={tooltip.content} position="top" />
        </span>
        <button
            type="button"
            onClick={() => onChange(!enabled)}
            className={`${
                enabled ? 'bg-cyan-500' : 'bg-gray-600'
            } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-800`}
            role="switch"
            aria-checked={enabled}
            aria-label={label}
        >
            <span
                aria-hidden="true"
                className={`${
                    enabled ? 'translate-x-5' : 'translate-x-0'
                } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
            />
        </button>
    </div>
);

const Controls: React.FC<ControlsProps> = ({ settings, setSettings, status, onStart, onStop, onReset }) => {
    const handleSettingsChange = (field: keyof SimulationSettings) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setSettings(prev => ({ ...prev, [field]: Number(e.target.value) }));
    };
    const handleFocusModeChange = (enabled: boolean) => {
        setSettings(prev => ({ ...prev, isFocusModeEnabled: enabled }));
    };
    const isRunning = status === 'running';

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-center text-cyan-400">시뮬레이션 제어</h2>
            <div className="space-y-4">
                <Slider label="α-입자 운동 에너지" tooltip={explanations.kineticEnergy} value={settings.energy} min={1} max={15} step={0.5} unit="MeV" onChange={handleSettingsChange('energy')} />
                <Slider label="알파 입자 수" tooltip={explanations.particleCount} value={settings.numParticles} min={50} max={300} step={10} unit="" onChange={handleSettingsChange('numParticles')} />
                <Slider label="표적핵 전하량 (Z)" tooltip={explanations.targetZ} value={settings.targetZ} min={1} max={118} step={1} unit="" onChange={handleSettingsChange('targetZ')} />
            </div>
            <div className="pt-2 border-t border-gray-700">
                <ToggleSwitch 
                    label="원자핵 집중 탐사"
                    tooltip={explanations.focusMode}
                    enabled={settings.isFocusModeEnabled}
                    onChange={handleFocusModeChange}
                />
            </div>
            <div className="flex justify-center gap-2 pt-2">
                <button 
                    onClick={isRunning ? onStop : onStart} 
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 font-semibold text-white bg-cyan-600 rounded-md hover:bg-cyan-700 disabled:bg-gray-500 transition-colors"
                >
                    <Icon name={isRunning ? "pause" : "play"} className="w-5 h-5" />
                    {isRunning ? '일시정지' : (status === 'paused' ? '계속' : '시작')}
                </button>
                <button 
                    onClick={onReset}
                    className="p-3 font-semibold text-white bg-gray-600 rounded-md hover:bg-gray-700 transition-colors"
                    title="시뮬레이션 초기화"
                >
                    <Icon name="reset" className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

// --- From components/SimulationCanvas.tsx ---
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

    const colorMap = useMemo(() => new Map(particles.map(p => [p.id, p.color])), [particles]);

    useLayoutEffect(() => {
        const group = pathGroupRef.current;
        if (!group) return;

        if (simulationId !== lastSimulationIdRef.current) {
            group.innerHTML = '';
            polylinesRef.current = {};
            lastSimulationIdRef.current = simulationId;
        }

        for (const idStr in newPaths) {
            const id = Number(idStr);
            const pointsToAdd = newPaths[id];
            if (!pointsToAdd || pointsToAdd.length === 0) continue;

            let polyline = polylinesRef.current[id];
            
            if (!polyline) {
                const color = colorMap.get(id);
                if (!color) continue; 

                polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
                polyline.setAttribute('fill', 'none');
                polyline.setAttribute('stroke', color);
                polyline.setAttribute('stroke-width', '1.5');
                polyline.setAttribute('stroke-opacity', '0.7');
                group.appendChild(polyline);
                polylinesRef.current[id] = polyline;
            }
            
            const newPointsString = pointsToAdd.map(p => `${p.x},${p.y}`).join(' ');
            const existingPoints = polyline.getAttribute('points') || '';
            polyline.setAttribute('points', existingPoints ? `${existingPoints} ${newPointsString}` : newPointsString);
        }
    }, [newPaths, simulationId, colorMap]);

    return (
        <div className="bg-black rounded-lg shadow-lg overflow-hidden border-2 border-gray-700">
            <svg width="100%" viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}>
                <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(55, 65, 81, 0.5)" strokeWidth="1"/>
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
                <g ref={pathGroupRef} />

                {particles.map(p => {
                    const canvasPos = {
                        x: p.position.x / SCALE + CANVAS_WIDTH / 2,
                        y: p.position.y / SCALE + CANVAS_HEIGHT / 2
                    };
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

                <circle cx={CANVAS_WIDTH / 2} cy={CANVAS_HEIGHT / 2} r={nucleusRadiusOnCanvas} fill="gold" stroke="yellow" strokeWidth="2" />
                 <circle cx={CANVAS_WIDTH / 2} cy={CANVAS_HEIGHT / 2} r={nucleusRadiusOnCanvas + 5} fill="none" stroke="rgba(255, 215, 0, 0.3)" strokeWidth="1" />
            </svg>
        </div>
    );
};

// --- From App.tsx ---
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
            
            sendUpdate();

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
                        setSimulationId(id => id + 1);
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


// --- From original index.tsx ---
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
