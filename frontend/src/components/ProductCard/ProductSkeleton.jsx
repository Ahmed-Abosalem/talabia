import React from "react";
import "./ProductSkeleton.css";

const ProductSkeleton = () => {
    return (
        <div className="product-skeleton-card">
            <div className="skeleton-image-wrapper">
                <div className="skeleton-box skeleton-pulse" />
            </div>
            <div className="skeleton-content">
                <div className="skeleton-title skeleton-pulse" />
                <div className="skeleton-text skeleton-pulse" />
                <div className="skeleton-row">
                    <div className="skeleton-price skeleton-pulse" />
                    <div className="skeleton-circle skeleton-pulse" />
                </div>
                <div className="skeleton-divider" />
                <div className="skeleton-actions">
                    <div className="skeleton-icon-btn skeleton-pulse" />
                    <div className="skeleton-icon-btn skeleton-pulse" />
                    <div className="skeleton-icon-btn skeleton-pulse" />
                </div>
            </div>
        </div>
    );
};

export default ProductSkeleton;
