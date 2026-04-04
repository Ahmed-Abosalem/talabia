import React, { useEffect, useState } from 'react';
import './SplashScreen.css';
import logo from '@/assets/logo.png'; // Assuming logo is here based on Footer.jsx

/**
 * 🌟 Premium SplashScreen for Talabia
 * Provides a smooth, branded introduction for the Android/Mobile App.
 */
const SplashScreen = ({ onComplete }) => {
    const [isExiting, setIsExiting] = useState(false);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        // Step 1: Initial Solid Color Parity Frame (50ms)
        const readyTimer = setTimeout(() => setIsReady(true), 100);

        // Step 2: Exit to Home Screen (1200ms)
        const exitTimer = setTimeout(() => setIsExiting(true), 1200);
        const completeTimer = setTimeout(() => onComplete?.(), 1600);

        return () => {
            clearTimeout(readyTimer);
            clearTimeout(exitTimer);
            clearTimeout(completeTimer);
        };
    }, [onComplete]);

    return (
        <div className={`splash-root ${isExiting ? 'exiting' : ''} ${isReady ? 'ready' : ''}`}>
            <div className="splash-content">
                <img src={logo} alt="طلبية" className="splash-logo" />
                <p className="splash-tagline">بوابتك للتجارة الإلكترونية</p>
            </div>
        </div>
    );
};

export default SplashScreen;
