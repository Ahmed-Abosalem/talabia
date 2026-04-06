import React from "react";
import "./EliteHomeSkeleton.css";

const EliteHomeSkeleton = () => {
    // 📦 Helper to render individual product skeletons (4 of them)
    const ProductCardSkeleton = () => (
        <div className="product-skeleton-placeholder shimmer-effect" style={{ 
            aspectRatio: '0.65', 
            borderRadius: '12px',
            backgroundColor: '#fff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
            <div className="shimmer-effect" style={{ height: '60%', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }} />
            <div style={{ padding: '10px' }}>
                <div className="shimmer-effect" style={{ height: '14px', width: '80%', marginBottom: '8px', borderRadius: '4px' }} />
                <div className="shimmer-effect" style={{ height: '12px', width: '50%', marginBottom: '15px', borderRadius: '4px' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                     <div className="shimmer-effect" style={{ height: '18px', width: '40%', borderRadius: '4px' }} />
                     <div className="shimmer-effect" style={{ height: '24px', width: '24px', borderRadius: '50%' }} />
                </div>
            </div>
        </div>
    );

    return (
        <div className="elite-home-skeleton">
            {/* 📺 Banner Section */}
            <div className="skeleton-banner-section">
                <div className="skeleton-banner-box shimmer-effect" />
            </div>

            {/* 🔘 Categories Strip */}
            <div className="skeleton-categories-strip">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="skeleton-category-item">
                        <div className="skeleton-category-circle shimmer-effect" />
                        <div className="skeleton-category-text shimmer-effect" />
                    </div>
                ))}
            </div>

            {/* 🏷️ Info Bar */}
            <div className="skeleton-info-bar">
                <div className="skeleton-title-box shimmer-effect" />
                <div className="skeleton-sort-box shimmer-effect" />
            </div>

            {/* 📦 Products Grid */}
            <div className="skeleton-products-grid">
                {Array.from({ length: 4 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                ))}
            </div>
        </div>
    );
};

export default EliteHomeSkeleton;
