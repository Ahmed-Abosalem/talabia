import React from 'react';
import '../../styles/system/container-system.css';

/**
 * AppContainer
 * A centralized container component that ensures content stays within
 * safe responsive boundaries across all device sizes.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className] - Additional classes
 * @param {boolean} [props.fluid] - If true, container spans full width without max-width constraints
 */
export const AppContainer = ({ children, className = "", fluid = false }) => {
    const containerClass = fluid ? "app-container-fluid" : "app-container";
    return (
        <div className={`${containerClass} ${className}`}>
            {children}
        </div>
    );
};

export default AppContainer;
