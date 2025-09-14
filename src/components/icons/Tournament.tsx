import * as React from "react";

type IconProps = {
    size?: number | string;
    color?: string;
    strokeWidth?: number;
    className?: string;
};

export function Tournament({
                               size = 24,
                               color = "currentColor",
                               strokeWidth = 1.5,
                               className,
                           }: IconProps) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <path d="M9 2H2v2h5v4H2v2h7V7h5v10H9v-3H2v2h5v4H2v2h7v-3h7v-6h6v-2h-6V5H9V2z" fill={color} strokeWidth={strokeWidth}/>
        </svg>
    );
}
