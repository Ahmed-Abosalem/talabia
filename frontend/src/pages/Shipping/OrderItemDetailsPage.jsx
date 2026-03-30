import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getShippingOrders } from "@/services/shippingService";
import { getOrderStatusLabel, normalizeOrderStatusCode } from "@/config/orderStatus";
import { formatCurrency, formatDate, resolveAssetUrl } from "@/utils/formatters";
import { useApp } from "@/context/AppContext";
import { ArrowRight } from "lucide-react";
import "./OrderItemDetailsPage.css";


// Note: buildProductImageUrl has been replaced by centralized resolveAssetUrl

export default function OrderItemDetailsPage() {
    const { orderId, itemId } = useParams();
    const navigate = useNavigate();
    const { showToast } = useApp();
    const [shipment, setShipment] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchDetails() {
            setIsLoading(true);
            try {
                const data = await getShippingOrders();
                // Simple filter logic since there is no single item API
                const allOrders = data;
                let foundItem = null;

                for (const order of allOrders) {
                    const currentOrderId = order._id || order.id;
                    if (String(currentOrderId) === String(orderId)) {
                        const items = order.orderItems || order.items || [];
                        const match = items.find(it => String(it._id || it.id) === String(itemId));
                        if (match) {
                            // Found the order and the item, now normalize it
                            // (Using a simplified version of the normalization logic from Dashboard)
                            foundItem = {
                                orderRaw: order,
                                itemRaw: match
                            };
                            break;
                        }
                    }
                }

                if (foundItem) {
                    setShipment(foundItem);
                } else {
                    showToast("تعذّر العثور على بيانات العنصر.", "error");
                    navigate("/shipping");
                }
            } catch (error) {
                console.error("Error fetching order item details:", error);
                showToast("خطأ في الاتصال بالخادم.", "error");
            } finally {
                setIsLoading(false);
            }
        }

        fetchDetails();
    }, [orderId, itemId, navigate, showToast]);

    const details = useMemo(() => {
        if (!shipment) return null;
        const { orderRaw, itemRaw } = shipment;

        const productName = itemRaw.name || itemRaw.productName || itemRaw.product?.name || "منتج";
        const qty = itemRaw.qty || itemRaw.quantity || 1;
        const price = itemRaw.price || itemRaw.unitPrice || 0;
        const total = price * qty;
        const shippingPrice = orderRaw.shippingCost || orderRaw.shippingPrice || 0;

        const unifiedStatusCode = normalizeOrderStatusCode({
            statusCode: itemRaw.statusCode || itemRaw.status_code || orderRaw.statusCode || orderRaw.status_code,
            sellerStatus: itemRaw.sellerStatus || itemRaw.seller_status || orderRaw.sellerStatus || orderRaw.seller_status,
            shippingStatus: itemRaw.shippingStatus || itemRaw.shipping_status || orderRaw.shippingStatus,
            status: itemRaw.status,
        });

        const label = getOrderStatusLabel(unifiedStatusCode);

        // Image logic
        let rawImg = itemRaw.image || itemRaw.imageUrl || "";
        if (!rawImg && Array.isArray(itemRaw.product?.images) && itemRaw.product.images.length > 0) {
            const first = itemRaw.product.images[0];
            rawImg = typeof first === "string" ? first : (first?.url || first?.secure_url || first?.path || "");
        }
        const productImage = resolveAssetUrl(rawImg);

        // Addresses (Simplified Unified Flow)
        const sAddr = orderRaw.shippingAddress || {};
        const shippingAddressParts = [
            sAddr.country,
            sAddr.city,
            sAddr.district,
            sAddr.neighborhood,
            sAddr.street || sAddr.details,
        ].filter(Boolean).map(p => String(p).trim());

        const stAddr = itemRaw.store?.address || orderRaw.store?.address || {};
        const sellerAddressParts = [
            stAddr.country,
            stAddr.city,
            stAddr.area || stAddr.district,
            stAddr.neighborhood || stAddr.street,
            stAddr.details || stAddr.addressDetails,
        ].filter(Boolean).map(p => String(p).trim());

        return {
            productName,
            productDescription: itemRaw.product?.description || itemRaw.description || "لا يوجد وصف متوفر.",
            productImage,
            qty,
            total: formatCurrency(total),
            shippingPrice: formatCurrency(shippingPrice),
            orderNumber: orderRaw.orderNumber || String(orderId).slice(-6),
            itemIndex: (orderRaw.orderItems || []).findIndex(it => String(it._id || it.id) === String(itemId)) + 1,
            date: formatDate(orderRaw.createdAt),
            paymentMethod: orderRaw.paymentMethod === "COD" ? "الدفع عند الاستلام" : orderRaw.paymentMethod === "Wallet" ? "الدفع بالمحفظة" : orderRaw.paymentMethod === "Online" ? (orderRaw.paymentSubMethod === "BANK_TRANSFER" ? "الحوالة البنكية" : "الدفع بالبطاقة") : orderRaw.paymentMethod || "—",
            statusLabel: label,
            storeName: itemRaw.store?.name || orderRaw.storeName || "—",
            sellerAddress: sellerAddressParts.length > 0 ? sellerAddressParts.join("، ") : (itemRaw.store?.address || "—"),
            sellerPhone: itemRaw.store?.phone || "—",
            sellerEmail: itemRaw.store?.email || "—",
            buyerName: orderRaw.buyer?.name || orderRaw.shippingAddress?.fullName || "—",
            buyerAddress: shippingAddressParts.length > 0 ? shippingAddressParts.join("، ") : "—",
            buyerPhone: orderRaw.shippingAddress?.phone || orderRaw.buyer?.phone || "—",
            buyerEmail: orderRaw.buyer?.email || "—",
            // Payment Status (Unified)
            paymentStatusKey: (function() {
                if (orderRaw.paymentMethod === "Wallet") return "paid";
                if (orderRaw.paymentSubMethod === "CARD") return orderRaw.isPaid ? "paid" : "pending";
                if (orderRaw.paymentSubMethod === "BANK_TRANSFER" || orderRaw.paymentMethod === "Online") {
                    if (orderRaw.bankTransferStatus === "confirmed") return "paid";
                    if (orderRaw.bankTransferStatus === "rejected") return "rejected";
                    return "pending_review";
                }
                if (orderRaw.paymentMethod === "COD") return "cod";
                return "pending";
            })(),
            paymentStatusLabel: (function() {
                if (orderRaw.paymentMethod === "Wallet") return "مدفوع";
                if (orderRaw.paymentSubMethod === "CARD") return orderRaw.isPaid ? "مدفوع" : "بانتظار الدفع";
                if (orderRaw.paymentSubMethod === "BANK_TRANSFER" || orderRaw.paymentMethod === "Online") {
                    if (orderRaw.bankTransferStatus === "confirmed") return "مدفوع";
                    if (orderRaw.bankTransferStatus === "rejected") return "مرفوض";
                    return "بانتظار المراجعة";
                }
                if (orderRaw.paymentMethod === "COD") return "عند الاستلام";
                return "بانتظار";
            })(),
        };
    }, [shipment, orderId, itemId]);

    if (isLoading) return <div className="details-loading">جارِ تحميل التفاصيل...</div>;
    if (!details) return null;

    return (
        <div className="order-item-details-page">
            {/* 💳 الهيدر الموحد الجديد (Unified Details Header) */}
            <div className="details-header-card">
                <div className="header-main-content">
                    <h1 className="header-title">تفاصيل الطلب</h1>

                    <button className="header-back-btn" onClick={() => navigate("/shipping")}>
                        <ArrowRight size={18} />
                        <span>العودة للوحة الشحن</span>
                    </button>
                </div>
            </div>

            <div className="details-grid">
                {/* القسم الأول: الصورة */}
                <div className="details-section hero-section">
                    <div className="details-image-container">
                        <img src={details.productImage} alt={details.productName} className="details-main-img" />
                        <div className="details-status-badge">{details.statusLabel}</div>
                        <div className={`details-payment-badge payment-${details.paymentStatusKey}`}>
                            {details.paymentStatusLabel}
                        </div>
                    </div>
                </div>

                {/* القسم الثاني: بيانات المنتج */}
                <div className="details-section product-info-section">
                    <div className="section-title">

                        <h2>بيانات المنتج</h2>
                    </div>
                    <div className="info-card">
                        <h3 className="full-product-name">{details.productName}</h3>
                        <div className="product-meta">
                            <div className="meta-item"><span>الكمية:</span> <span className="num-accent">{details.qty}</span></div>
                            <div className="meta-item"><span>السعر:</span> <span className="num-accent">{details.total}</span></div>
                            <div className="meta-item"><span>رسوم الشحن:</span> <span className="num-accent">{details.shippingPrice}</span></div>
                        </div>
                        <div className="full-description">
                            <h4>الوصف الكامل:</h4>
                            <p>{details.productDescription}</p>
                        </div>
                    </div>
                </div>

                {/* القسم الثالث: بيانات الطلب */}
                <div className="details-section order-meta-section">
                    <div className="section-title">

                        <h2>بيانات الطلب</h2>
                    </div>
                    <div className="info-card">
                        <div className="info-row">
                            <div className="info-item">
                                <span className="label">رقم الطلب:</span>
                                <span className="value">#{details.orderNumber}</span>
                            </div>
                            <div className="info-item">
                                <span className="label">رقم العنصر:</span>
                                <span className="value">{details.itemIndex}</span>
                            </div>
                        </div>
                        <div className="info-row">
                            <div className="info-item">
                                <span className="label">التاريخ:</span>
                                <span className="value">{details.date}</span>
                            </div>
                            <div className="info-item">
                                <span className="label">طريقة الدفع:</span>
                                <span className="value">{details.paymentMethod}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* القسم الرابع: بيانات البائع */}
                <div className="details-section participant-section">
                    <div className="section-title">

                        <h2>بيانات البائع كاملة</h2>
                    </div>
                    <div className="info-card">
                        <h4 className="participant-name">{details.storeName}</h4>
                        <div className="contact-list">
                            <div className="contact-item">

                                <span>{details.sellerAddress}</span>
                            </div>
                            <div className="contact-item">

                                <span className="num-accent">{details.sellerPhone}</span>
                            </div>
                            <div className="contact-item">

                                <span>{details.sellerEmail}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* القسم الخامس: بيانات المشتري */}
                <div className="details-section participant-section">
                    <div className="section-title">

                        <h2>بيانات المشتري كاملة</h2>
                    </div>
                    <div className="info-card">
                        <h4 className="participant-name">{details.buyerName}</h4>
                        <div className="contact-list">
                            <div className="contact-item">

                                <span>{details.buyerAddress}</span>
                            </div>
                            <div className="contact-item">

                                <span className="num-accent">{details.buyerPhone}</span>
                            </div>
                            <div className="contact-item">

                                <span>{details.buyerEmail}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
