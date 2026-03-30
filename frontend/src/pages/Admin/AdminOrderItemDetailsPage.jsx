import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowRight, Package, Store, User, ShoppingBag, CreditCard, Calendar, Truck, Globe, MapPin, Phone, Mail } from "lucide-react";
import { getAdminOrders } from "@/services/adminService";
import { getOrderStatusLabel, normalizeOrderStatusCode } from "@/config/orderStatus";
import { formatCurrency, formatDate, resolveAssetUrl } from "@/utils/formatters";
import { useApp } from "@/context/AppContext";
import "./AdminOrderItemDetailsPage.css";

export default function AdminOrderItemDetailsPage() {
    const { orderId, itemId } = useParams();
    const navigate = useNavigate();
    const { showToast } = useApp() || {};

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [data, setData] = useState(null);

    useEffect(() => {
        fetchDetails();
    }, [orderId, itemId]);

    async function fetchDetails() {
        try {
            setLoading(true);
            setError("");
            // Currently fetching all orders to find specific one as adminService list is optimized
            // In a large system, a single order API would be better, but we follow existing patterns.
            const response = await getAdminOrders();
            const rawOrders = Array.isArray(response?.orders)
                ? response.orders
                : Array.isArray(response)
                    ? response
                    : [];

            let foundOrder = null;
            let foundItem = null;

            if (Array.isArray(rawOrders)) {
                foundOrder = rawOrders.find(o => String(o._id || o.id) === String(orderId));
                if (foundOrder && foundOrder.orderItems) {
                    // Try to find by ID first, then by composite fallback (orderId-index)
                    foundItem = foundOrder.orderItems.find((it, index) => {
                        const itId = it._id || it.id || `${orderId}-${index + 1}`;
                        if (String(itId) === String(itemId)) {
                            setData({ order: foundOrder, item: it, itemIndex: index + 1 });
                            return true;
                        }
                        return false;
                    });
                }
            }

            if (!foundOrder || !foundItem) {
                setError("تعذر العثور على هذا المنتج داخل الطلب");
            }
        } catch (err) {
            console.error("Error fetching order item details:", err);
            setError("فشل الاتصال بالخادم لمزامنة بيانات الطلب");
        } finally {
            setLoading(false);
        }
    }

    // --- Data Normalization ---
    const detail = useMemo(() => {
        if (!data) return null;
        const { order, item } = data;

        // Unified Image Resolver matching AdminOrdersSection
        const resolveProductImageSrc = (src) => {
            if (!src) return "";
            const raw = String(src).trim();
            if (!raw) return "";
            if (raw.startsWith("data:") || raw.startsWith("blob:")) return raw;
            if (raw.startsWith("http://") || raw.startsWith("https://")) {
                const idx = raw.indexOf("/uploads/");
                if (idx !== -1) return raw.slice(idx);
                return raw;
            }
            if (raw.startsWith("/uploads/")) return raw;
            if (raw.startsWith("uploads/")) return `/${raw}`;
            if (raw.startsWith("products/")) return `/uploads/${raw.replace(/^\/+/, "")}`;
            if (!raw.includes("/")) return `/uploads/products/${raw.replace(/^\/+/, "")}`;
            return raw;
        };

        const productName = item.name || item.productName || item.product?.name || "منتج غير محدد";
        const productImage = resolveProductImageSrc(item.image || item.product?.mainImage || "");

        // Category Resolution matching AdminOrdersSection
        let productCategory = "غير محدد";
        const catFromProduct = item.product?.category != null ? item.product.category : item.category;
        if (catFromProduct) {
            if (typeof catFromProduct === "object") {
                productCategory = catFromProduct.name || catFromProduct.title || "غير محدد";
            } else if (item.categoryName) {
                productCategory = item.categoryName;
            }
        } else if (item.categoryName) {
            productCategory = item.categoryName;
        }

        const statusCode = item.statusCode || order.statusCode || normalizeOrderStatusCode(order);
        const statusLabel = getOrderStatusLabel(statusCode);

        // Unified Address Normalization matching AdminOrdersSection
        const formatAddress = (addr) => {
            if (!addr) return "—";
            if (typeof addr === "string") return addr;

            const country = (addr.country || "").toString().trim();
            const city = (addr.city || "").toString().trim();
            const directorate = (addr.area || addr.district || addr.directorate || addr.municipality || "").toString().trim();
            const neighborhood = (addr.street || addr.neighborhood || addr.quarter || addr.hay || "").toString().trim();
            const details = (addr.details || addr.moreDetails || addr.addressLine || "").toString().trim();

            const parts = [country, city, directorate, neighborhood, details]
                .filter(Boolean)
                .map((p) => String(p).trim())
                .filter(Boolean);

            return parts.join(" - ") || "—";
        };

        const paymentMethodRaw = order.paymentMethod || order.payment_method || "";
        const paymentSubMethod = (order.paymentSubMethod || order.payment_sub_method || "").toUpperCase();

        let paymentMethodLabel = paymentMethodRaw === "COD" ? "الدفع عند الاستلام" : paymentMethodRaw === "Wallet" ? "الدفع بالمحفظة" : "الدفع بالبطاقة";
        if (paymentSubMethod === "BANK_TRANSFER") paymentMethodLabel = "الحوالة البنكية";
        if (paymentSubMethod === "CARD") paymentMethodLabel = "الدفع بالبطاقة";

        // Logic Resolve Payment Status (Unified)
        let pLabel = "بانتظار";
        let pKey = "pending";

        const isPaid = order.isPaid || false;
        const bStatus = order.bankTransferStatus || "pending";

        if (paymentMethodRaw === "Wallet") {
            pLabel = "مدفوع"; pKey = "paid";
        } else if (paymentSubMethod === "CARD") {
            pLabel = isPaid ? "مدفوع" : "بانتظار الدفع";
            pKey = isPaid ? "paid" : "pending";
        } else if (paymentSubMethod === "BANK_TRANSFER" || paymentMethodRaw === "BANK_TRANSFER") {
            if (bStatus === "confirmed") { pLabel = "مدفوع"; pKey = "paid"; }
            else if (bStatus === "rejected") { pLabel = "مرفوض"; pKey = "rejected"; }
            else { pLabel = "بانتظار المراجعة"; pKey = "pending"; }
        } else if (paymentMethodRaw === "COD") {
            pLabel = "عند الاستلام"; pKey = "cod";
        }

        return {
            orderNumber: order.orderNumber || String(orderId).slice(-6),
            itemIndex: data.itemIndex,
            date: formatDate(order.createdAt),
            productName,
            productImage,
            productCategory,
            productDescription: item.product?.description || "لا يوجد وصف إضافي متوفر لهذا المنتج.",
            statusLabel,
            statusCode,
            qty: item.qty || 1,
            unitPrice: formatCurrency(item.price || 0),
            lineTotal: formatCurrency((item.qty || 1) * (item.price || 0)),
            sellerAmount: formatCurrency(item.sellerAmount || 0),
            platformCommission: formatCurrency(item.platformCommission || 0),
            shippingPrice: formatCurrency(order.shippingPrice || 0),
            shippingCompanyName: order.shippingCompany?.name || order.shippingCompanyName || "لم تُعيَّن بعد",
            paymentMethod: paymentMethodLabel,
            paymentSubMethod,
            paymentStatusLabel: pLabel,
            paymentStatusKey: pKey,
            bankTransferSenderName: order.bankTransferSenderName || order.bank_transfer_sender_name || "",
            bankTransferReferenceNumber: order.bankTransferReferenceNumber || order.bank_transfer_reference_number || "",

            // Store / Seller Info
            storeName: order.store?.name || order.seller?.storeName || "—",
            storeAddress: formatAddress(order.store?.address),
            storePhone: order.store?.phone || order.seller?.phone || "—",
            storeEmail: order.store?.email || order.seller?.email || "—",

            // Buyer / Shipping Info
            buyerName: order.shippingAddress?.fullName || order.buyer?.name || "—",
            buyerAddress: formatAddress(order.shippingAddress),
            buyerPhone: order.shippingAddress?.phone || order.buyer?.phone || "—",
            buyerEmail: order.buyer?.email || "—",
        };
    }, [data, orderId]);

    if (loading) {
        return (
            <div className="adm-page-root">
                <div className="adm-loading">
                    <Package size={40} className="spin" />
                    <p>جاري مزامنة بيانات الطلب...</p>
                </div>
            </div>
        );
    }

    if (error || !detail) {
        return (
            <div className="adm-page-root">
                <div className="adm-main-container">
                    <div className="adm-error-box">
                        <ArrowRight size={20} style={{ cursor: 'pointer' }} onClick={() => navigate(-1)} />
                        <span>{error || "حدث خطأ غير متوقع"}</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="adm-page-root">
            {/* 🏔️ Glassmorphic Header */}
            <header className="adm-header">
                <div className="adm-header-inner">
                    <div className="adm-header-right">
                        <button className="adm-btn-back" onClick={() => navigate(-1)}>
                            <ArrowRight size={20} />
                        </button>
                        <div className="adm-header-titles">
                            <h1 className="adm-page-title">تفاصيل المنتج في الطلب</h1>
                            <div className="adm-header-meta">
                                <span className="adm-role-badge">
                                    <span># {detail.orderNumber}</span>
                                    {detail.itemIndex && (
                                        <>
                                            <span className="adm-badge-divider" />
                                            <span>{detail.itemIndex}</span>
                                        </>
                                    )}
                                </span>
                                <span className="adm-header-meta-item">
                                    <Calendar size={13} /> {detail.date}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="adm-main-container">
                <div className="adm-details-grid">

                    {/* Header Card - Product Info */}
                    <div className="span-12">
                        <div className="adm-card">
                            <div className="adm-card-body hero-card">
                                <div className="hero-image-wrapper">
                                    <img src={detail.productImage} alt={detail.productName} />
                                    <div className={`order-payment-badge payment-${detail.paymentStatusKey}`}>
                                        {detail.paymentStatusLabel}
                                    </div>
                                </div>
                                <div className="hero-content">
                                    <div className="item-status-display">
                                        <Package size={16} />
                                        <span>{detail.statusLabel}</span>
                                        <span style={{ margin: '0 8px', opacity: 0.3 }}>|</span>
                                        <Globe size={14} />
                                        <span>{detail.productCategory}</span>
                                    </div>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.5rem 0' }}>{detail.productName}</h2>
                                    <p style={{ color: 'var(--adm-text-muted)', lineHeight: 1.6 }}>{detail.productDescription}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Financial & Order Meta */}
                    <div className="span-4">
                        <div className="adm-card">
                            <div className="adm-card-header">
                                <CreditCard size={18} />
                                <h2>البيانات المالية</h2>
                            </div>
                            <div className="adm-card-body">
                                <div className="adm-info-grid">
                                    <div className="adm-info-point">
                                        <span className="label">سعر الوحدة</span>
                                        <span className="value price">{detail.unitPrice}</span>
                                    </div>
                                    <div className="adm-info-point">
                                        <span className="label">الكمية</span>
                                        <span className="value">{detail.qty}</span>
                                    </div>
                                    <div className="adm-info-point span-2">
                                        <span className="label">الإجمالي (لهذا العنصر)</span>
                                        <span className="value price">{detail.lineTotal}</span>
                                    </div>
                                    <div className="adm-info-point">
                                        <span className="label" style={{ color: 'var(--adm-teal)' }}>نصيب البائع</span>
                                        <span className="value" style={{ color: 'var(--adm-teal)', fontWeight: 700 }}>{detail.sellerAmount}</span>
                                    </div>
                                    <div className="adm-info-point">
                                        <span className="label" style={{ color: 'var(--adm-danger)' }}>عمولة المنصة</span>
                                        <span className="value" style={{ color: 'var(--adm-danger)', fontWeight: 700 }}>{detail.platformCommission}</span>
                                    </div>
                                    <div className="adm-info-point span-2">
                                        <span className="label">رسوم شحن الطلب</span>
                                        <span className="value">{detail.shippingPrice}</span>
                                    </div>
                                    <div className="adm-info-point span-2">
                                        <span className="label">شركة الشحن</span>
                                        <span className="value">{detail.shippingCompanyName}</span>
                                    </div>
                                    <div className="adm-info-point span-2">
                                        <span className="label">وسيلة الدفع</span>
                                        <span className="value">
                                            {detail.paymentMethod}
                                            {detail.paymentSubMethod === "BANK_TRANSFER" && (
                                                <div className="bank-transfer-details" style={{ marginTop: '0.4rem', fontSize: '0.8rem', opacity: 0.8 }}>
                                                    <div>المرسل: {detail.bankTransferSenderName || "—"}</div>
                                                    <div>الرقم المرجعي: {detail.bankTransferReferenceNumber || "—"}</div>
                                                </div>
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Seller Details */}
                    <div className="span-4">
                        <div className="adm-card">
                            <div className="adm-card-header">
                                <Store size={18} />
                                <h2>بيانات البائع</h2>
                            </div>
                            <div className="adm-card-body">
                                <div className="adm-info-grid">
                                    <div className="adm-info-point span-2">
                                        <span className="label">اسم المتجر</span>
                                        <span className="value">{detail.storeName}</span>
                                    </div>
                                    <div className="adm-info-point span-2">
                                        <span className="label">العنوان</span>
                                        <span className="value" style={{ fontSize: '0.85rem' }}>{detail.storeAddress}</span>
                                    </div>
                                    <div className="adm-info-point span-2">
                                        <span className="label">الهاتف</span>
                                        <span className="value monospace">{detail.storePhone}</span>
                                    </div>
                                    <div className="adm-info-point span-2">
                                        <span className="label">البريد الإلكتروني</span>
                                        <span className="value monospace" style={{ fontSize: '0.8rem' }}>{detail.storeEmail}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Buyer Details */}
                    <div className="span-4">
                        <div className="adm-card">
                            <div className="adm-card-header">
                                <User size={18} />
                                <h2>بيانات المشتري</h2>
                            </div>
                            <div className="adm-card-body">
                                <div className="adm-info-grid">
                                    <div className="adm-info-point span-2">
                                        <span className="label">الاسم الكامل</span>
                                        <span className="value">{detail.buyerName}</span>
                                    </div>
                                    <div className="adm-info-point span-2">
                                        <span className="label">عنوان الشحن</span>
                                        <span className="value" style={{ fontSize: '0.85rem' }}>{detail.buyerAddress}</span>
                                    </div>
                                    <div className="adm-info-point span-2">
                                        <span className="label">الهاتف</span>
                                        <span className="value monospace">{detail.buyerPhone}</span>
                                    </div>
                                    <div className="adm-info-point span-2">
                                        <span className="label">البريد الإلكتروني</span>
                                        <span className="value monospace" style={{ fontSize: '0.8rem' }}>{detail.buyerEmail}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
