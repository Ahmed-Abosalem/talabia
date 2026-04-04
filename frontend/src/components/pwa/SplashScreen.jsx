import React, { useEffect, useState } from 'react';
import './SplashScreen.css';
import logo from '@/assets/logo.png'; // Assuming logo is here based on Footer.jsx

/**
 * 🌟 Premium SplashScreen for Talabia
 * Provides a smooth, branded introduction for the Android/Mobile App.
 */
const SplashScreen = ({ onComplete }) => {
    const [animationState, setAnimationState] = useState('entering');

    useEffect(() => {
        // Step 1: 1.2s of pure branded visibility
        const exitTimer = setTimeout(() => {
            setAnimationState('exiting');
        }, 1200); 

        // Step 2: Transition to Home after 0.4s fade-out (Total 1.6s)
        const completeTimer = setTimeout(() => {
            if (onComplete) onComplete();
        }, 1600); 

        return () => {
            clearTimeout(exitTimer);
            clearTimeout(completeTimer);
        };
    }, [onComplete]);

    return (
        <div className={`splash-root ${animationState}`}>
            <div className="splash-content">
                <div className="splash-logo-wrapper">
                    <img src={logo} alt="طلبية" className="splash-logo" />
                </div>
                <p className="splash-tagline">بوابتك للتجارة الإلكترونية</p>
            </div>
        </div>
    );
};

export default SplashScreen;
