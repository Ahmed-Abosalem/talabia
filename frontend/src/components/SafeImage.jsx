import React, { useState, useEffect } from "react";

const SafeImage = ({ src, alt, className, fallback = "/assets/placeholders/product-placeholder.jpg", ...props }) => {
    const [imgSrc, setImgSrc] = useState(src);
    const [isError, setIsError] = useState(false);

    // ✅ مزامنة الصورة عند تغيير src من الخارج (مثل: وصول بيانات الإعلانات لاحقاً)
    useEffect(() => {
        if (src) {
            setImgSrc(src);
            setIsError(false);
        }
    }, [src]);

    const handleError = () => {
        if (!isError) {
            setImgSrc(fallback);
            setIsError(true);
        }
    };

    return (
        <img
            src={imgSrc || fallback}
            alt={alt}
            className={className}
            onError={handleError}
            {...props}
        />
    );
};

export default SafeImage;
