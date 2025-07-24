import React from 'react';
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
import { ScatterPoint } from '../types';
import Tooltip from './Tooltip';
import { explanations } from './explanations';


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
                title: { display: false }, // Disabled in favor of custom label
                ticks: {
                    color: '#a0aec0',
                },
                grid: {
                    color: '#4a5568',
                },
            },
            y: {
                min: 0,
                max: 180,
                title: { display: false }, // Disabled in favor of custom label
                ticks: {
                    color: '#a0aec0',
                    stepSize: 30,
                },
                grid: {
                    color: '#4a5568',
                },
            },
        },
        plugins: {
            legend: {
                display: false,
            },
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
            {/* Y-Axis Label */}
            <div className="flex items-center justify-center pr-4" style={{ writingMode: 'vertical-rl' }}>
                 <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span>산란각 (°)</span>
                    <div style={{ writingMode: 'horizontal-tb' }}>
                        <Tooltip title={explanations.scatteringAngle.title} content={explanations.scatteringAngle.content} position="right" />
                    </div>
                </div>
            </div>

            <div className="flex-grow flex flex-col min-w-0">
                {/* Chart Area */}
                <div className="flex-grow w-full h-full">
                    <Scatter options={options} data={chartData} />
                </div>
                {/* X-Axis Label */}
                <div className="flex items-center justify-center pt-3 gap-2 text-sm text-gray-400">
                    <span>충돌 계수 (fm)</span>
                    <Tooltip title={explanations.impactParameter.title} content={explanations.impactParameter.content} />
                </div>
            </div>
        </div>
    );
};

export default AngleDistributionChart;