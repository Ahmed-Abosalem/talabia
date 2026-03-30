import React from 'react';
import { Facebook, Instagram } from 'lucide-react';
import { Link } from 'react-router-dom';
import './BottomBar.css';

const BottomBar = () => {
    return (
        <div className="bottom-bar">

            {/* 1️⃣ Social Zone */}
            <div className="social-zone">
                <div className="social-icons">
                    <a
                        href="https://facebook.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Facebook"
                    >
                        <Facebook size={18} />
                    </a>
                    <a
                        href="https://instagram.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Instagram"
                    >
                        <Instagram size={18} />
                    </a>
                </div>
            </div>

            {/* 2️⃣ Center Zone (Spacer/Balance) */}
            <div className="center-zone" />

            {/* 3️⃣ Privacy Zone */}
            <div className="privacy-zone">
                <Link to="/privacy-policy" className="privacy-link">
                    سياسة الخصوصية
                </Link>
            </div>

        </div>
    );
};

export default BottomBar;
