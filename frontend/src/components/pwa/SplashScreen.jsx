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
        // Step 1: Animation entry (just starts)
        const exitTimer = setTimeout(() => {
            setAnimationState('exiting');
        }, 1600); // Show for 1.6s

        const completeTimer = setTimeout(() => {
            if (onComplete) onComplete();
        }, 2000); // Fully done after 2s

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
                <h1 className="splash-title">طلبية</h1>
                <p className="splash-subtitle">بوابتك للتجارة الآمنة والعصرية</p>
                
                <div className="splash-loader">
                    <div className="splash-loader-bar"></div>
                </div>
            </div>
            
            <div className="splash-footer">
                <p>© 2025 طلبية. جميع الحقوق محفوظة.</p>
            </div>
        </div>
    );
};

export default SplashScreen;
