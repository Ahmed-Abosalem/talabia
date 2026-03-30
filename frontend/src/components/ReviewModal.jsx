import React, { useState, useEffect } from "react";
import { X, Star, Loader2 } from "lucide-react";
import "./ReviewModal.css";

export default function ReviewModal({
    isOpen,
    onClose,
    onSubmit,
    isSubmitting,
    initialRating = 0,
    initialComment = "",
    productName = "المنتج",
    mode = "create", // create | edit
}) {
    const [rating, setRating] = useState(initialRating);
    const [comment, setComment] = useState(initialComment);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setRating(initialRating);
            setComment(initialComment);
            setError(null);
        }
    }, [isOpen, initialRating, initialComment]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (rating < 1) {
            setError("الرجاء اختيار تقييم (نجمة واحدة على الأقل).");
            return;
        }
        onSubmit({ rating, comment });
    };

    return (
        <div className="review-modal-overlay" onClick={onClose}>
            <div
                className="review-modal-content"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                <button className="review-modal-close" onClick={onClose}>
                    <X size={20} />
                </button>

                <h3 className="review-modal-title">
                    {mode === "edit" ? "تعديل التقييم" : "تقييم المنتج"}
                </h3>
                <p className="review-modal-subtitle">{productName}</p>

                <form onSubmit={handleSubmit} className="review-modal-form">
                    <div className="review-modal-rating-section">
                        <label>التقييم العام</label>
                        <div className="review-modal-stars">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    className={`review-star-btn ${star <= rating ? "filled" : ""
                                        }`}
                                    onClick={() => {
                                        setRating(star);
                                        setError(null);
                                    }}
                                >
                                    <Star
                                        size={32}
                                        className={star <= rating ? "star-filled" : "star-empty"}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="review-modal-comment-section">
                        <label htmlFor="review-comment">ملاحظاتك (اختياري)</label>
                        <textarea
                            id="review-comment"
                            rows={4}
                            placeholder="اكتب رأيك حول جودة المنتج، التغليف، سرعة التوصيل..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="review-modal-textarea"
                            maxLength={1000}
                        />
                        <div className="review-char-count">{comment.length}/1000</div>
                    </div>

                    {error && <div className="review-modal-error">{error}</div>}

                    <div className="review-modal-actions">
                        <button
                            type="button"
                            className="review-btn-secondary"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            className="review-btn-primary"
                            disabled={isSubmitting || rating < 1}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="animate-spin" size={16} />
                                    جاري الإرسال...
                                </>
                            ) : (
                                "إرسال التقييم"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
