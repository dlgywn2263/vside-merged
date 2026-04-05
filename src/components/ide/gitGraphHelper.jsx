// src/utils/gitGraphHelper.jsx

import React from 'react';

// 💡 VS Code 스타일의 브랜치 색상 팔레트
const BRANCH_COLORS = ['#3b82f6', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#14b8a6', '#ef4444'];

export const renderGraph = (graphStr) => {
    if (!graphStr) return null;

    return (
        <div className="flex h-full items-center relative" style={{ minWidth: '100%' }}>
            {graphStr.split('').map((char, idx) => {
                if (char === ' ') return <div key={idx} style={{ width: '14px' }} className="h-full shrink-0" />;

                const color = BRANCH_COLORS[Math.floor(idx / 2) % BRANCH_COLORS.length];
                const baseStyle = { width: '14px', color: color };

                // 💡 [핵심 마법] 폰트 대신 SVG 벡터 선을 사용하여 위아래 빈 공간을 뚫고 완벽하게 이어지게 합니다!
                if (char === '*') {
                    return (
                        <div key={idx} className="relative h-full shrink-0 flex items-center justify-center" style={baseStyle}>
                            <svg className="absolute inset-0 w-full h-full overflow-visible z-0" viewBox="0 0 14 24" preserveAspectRatio="none">
                                <line x1="7" y1="-2" x2="7" y2="26" stroke="currentColor" strokeWidth="2" />
                            </svg>
                            <div className="relative z-10 w-[10px] h-[10px] rounded-full border-[2.5px] border-current bg-white"></div>
                        </div>
                    );
                }

                if (char === '|') {
                    return (
                        <div key={idx} className="relative h-full shrink-0 flex items-center justify-center" style={baseStyle}>
                            <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 14 24" preserveAspectRatio="none">
                                <line x1="7" y1="-2" x2="7" y2="26" stroke="currentColor" strokeWidth="2" />
                            </svg>
                        </div>
                    );
                }

                if (char === '/') {
                    return (
                        <div key={idx} className="relative h-full shrink-0" style={baseStyle}>
                            <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 14 24" preserveAspectRatio="none">
                                <line x1="14" y1="-2" x2="0" y2="26" stroke="currentColor" strokeWidth="2" />
                            </svg>
                        </div>
                    );
                }

                if (char === '\\') {
                    return (
                        <div key={idx} className="relative h-full shrink-0" style={baseStyle}>
                            <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 14 24" preserveAspectRatio="none">
                                <line x1="0" y1="-2" x2="14" y2="26" stroke="currentColor" strokeWidth="2" />
                            </svg>
                        </div>
                    );
                }
                
                if (char === '_') {
                    return (
                        <div key={idx} className="relative h-full shrink-0" style={baseStyle}>
                            <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 14 24" preserveAspectRatio="none">
                                <line x1="0" y1="12" x2="14" y2="12" stroke="currentColor" strokeWidth="2" />
                            </svg>
                        </div>
                    );
                }

                return <div key={idx} style={baseStyle} className="h-full shrink-0 flex items-center justify-center font-bold">{char}</div>;
            })}
        </div>
    );
};