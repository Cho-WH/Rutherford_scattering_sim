
import React from 'react';
import { SimulationSettings, SimulationStatus } from '../types';
import Tooltip from './Tooltip';
import { explanations } from './explanations';

// A simple Icon wrapper to make it easier to switch icon libraries if needed
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

export default Controls;