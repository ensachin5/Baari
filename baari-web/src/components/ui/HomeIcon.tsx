import React from "react";

interface HomeIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
  strokeWidth?: number;
  color?: string;
  filled?: boolean;
}

export const HomeIcon: React.FC<HomeIconProps> = ({
  size = 24,
  className = "",
  strokeWidth = 2,
  color = "currentColor",
  filled = false,
  ...props
}) => {
  if (filled) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        className={className}
        {...props}
      >
        {/* Filled House Body */}
        <path
          d="M2.5 10.5L12 3L21.5 10.5L19.5 12V20C19.5 20.5523 19.0523 21 18.5 21H5.5C4.94772 21 4.5 20.5523 4.5 20V12L2.5 10.5Z"
          fill={color}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Cutout Door */}
        <path
          d="M9.5 21V14.5C9.5 13.1193 10.6193 12 12 12C13.3807 12 14.5 13.1193 14.5 14.5V21Z"
          fill="#FFFFFF"
          stroke="#FFFFFF"
          strokeWidth={1}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      className={className}
      {...props}
    >
      {/* Roof eaves overhang */}
      <path
        d="M2.5 10.5L12 3L21.5 10.5"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* House walls and floor */}
      <path
        d="M4.5 9.5V20C4.5 20.5523 4.94772 21 5.5 21H18.5C19.0523 21 19.5 20.5523 19.5 20V9.5"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Arched center door */}
      <path
        d="M9.5 21V14.5C9.5 13.1193 10.6193 12 12 12C13.3807 12 14.5 13.1193 14.5 14.5V21"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
