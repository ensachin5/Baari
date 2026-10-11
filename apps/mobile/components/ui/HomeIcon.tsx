import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface HomeIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export const HomeIcon: React.FC<HomeIconProps> = ({
  size = 24,
  color = '#0A2540',
  strokeWidth = 2,
}) => {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
    >
      {/* Roof eaves overhang */}
      <Path
        d="M2.5 10.5L12 3L21.5 10.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* House walls and floor */}
      <Path
        d="M4.5 9.5V20C4.5 20.5523 4.94772 21 5.5 21H18.5C19.0523 21 19.5 20.5523 19.5 20V9.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Arched center door */}
      <Path
        d="M9.5 21V14.5C9.5 13.1193 10.6193 12 12 12C13.3807 12 14.5 13.1193 14.5 14.5V21"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};
