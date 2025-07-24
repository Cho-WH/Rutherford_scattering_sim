import React from 'react';

const Highlight: React.FC<{children: React.ReactNode}> = ({ children }) => <span className="text-cyan-400 font-semibold">{children}</span>;
const Bold: React.FC<{children: React.ReactNode}> = ({ children }) => <span className="font-bold text-gray-100">{children}</span>;

export const explanations = {
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
