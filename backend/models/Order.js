// ────────────────────────────────────────────────
// 📁 backend/models/Order.js
// نموذج الطلب في نظام طلبية (Talabia)
// ────────────────────────────────────────────────

import mongoose from "mongoose";
import { ORDER_STATUS_CODES } from "../utils/orderStatus.js";

// 🎯 مخطط عنصر الطلب (Order Item Schema)
// يمثّل منتجًا واحدًا داخل الطلب، مع حالة وتقييم مستقلّين
const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: { type: String, required: true },
    qty: { type: Number, required: true },
    price: { type: Number, required: true },
    image: { type: String },

    // ✅ (جديد) خصائص اختيارية: اللون/الحجم كما اختارها المشتري
    // تحفظ على مستوى عنصر الطلب (Order Item) لأن كل منتج قد يختلف اختياره
    selectedColor: { type: String, trim: true },
    selectedColorKey: { type: String, trim: true },
    selectedColorHex: { type: String, trim: true },

    selectedSize: { type: String, trim: true },
    selectedSizeKey: { type: String, trim: true },

    // 🔗 ربط اختياري بالبائع والمتجر لهذا المنتج (يمكن تعبئته لاحقًا تدريجيًا)
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
    },

    // 📌 حالة هذا المنتج داخل الطلب (Legacy - عربي)
    // ستبقى لفترة انتقالية، لكن مصدر الحقيقة الجديد هو statusCode
    itemStatus: {
      type: String,
      enum: ["جديد", "قيد المعالجة", "قيد الشحن", "مكتمل", "ملغى"],
      default: "جديد",
    },

    // 🧭 الحالة الموحدة على مستوى المنتج داخل الطلب (ثمانية أكواد)
    // هذا هو مصدر الحقيقة الرسمي لحالة المنتج داخل الطلب
    statusCode: {
      type: String,
      enum: Object.values(ORDER_STATUS_CODES),
      default: ORDER_STATUS_CODES.AT_SELLER_NEW,
    },

    // 🕒 وقت تسليم هذا المنتج (اختياري)
    deliveredAt: {
      type: Date,
    },

    // ⭐ بيانات تقييم المشتري لهذا المنتج
    rating: {
      value: {
        type: Number,
        min: 1,
        max: 5,
      },
      comment: {
        type: String,
      },
      ratedAt: {
        type: Date,
      },
    },

    // 👁️ إخفاء هذا المنتج من واجهة "طلباتي" للمشتري
    // دون حذفه فعليًا من قاعدة البيانات
    hiddenForBuyer: {
      type: Boolean,
      default: false,
    },

    // 🔐 كود التسليم الخاص بهذا المنتج داخل الطلب
    // هذا هو الكود الذي سيظهر للمشتري لكل منتج على حدة
    deliveryCode: {
      type: String,
      required: true,
    },

    // 🔢 رقم العنصر التسلسلي (مثال: 789546I1)
    itemNumber: {
      type: String,
      unique: true,
      sparse: true, // للسماح بالقيم null للمستندات القديمة
    },
  },
  {
    _id: true,
    timestamps: false,
  }
);

// 📦 مخطط الطلب (Order Schema)
const orderSchema = new mongoose.Schema(
  {
    // 🔢 رقم الطلب الأساسي (مثال: 789546)
    orderNumber: {
      type: String,
      unique: true,
      sparse: true,
    },

    // 👤 المشتري
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 🧑‍💼 البائع الرئيسي المرتبط بالطلب (للتوافق مع المنطق الحالي)
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 🏬 المتجر الأساسي
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },

    // 🚚 شركة الشحن المختارة (اختياري)
    shippingCompany: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShippingCompany",
    },

    // 🧾 عناصر الطلب (كل عنصر = منتج واحد + حالة وتقييم مستقلين)
    orderItems: [orderItemSchema],

    // 📍 عنوان الشحن
    // نضيف حقول الدولة / الحي / التفاصيل لتظهر في كرت شركة الشحن
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },

      // الدولة يمكن أن تكون اختيارية
      country: { type: String },

      city: { type: String, required: true },

      // الحي / المنطقة
      district: { type: String },

      // الحي
      neighborhood: { type: String },

      street: { type: String, required: true },

      // تفاصيل إضافية (مثل رقم العمارة / الشقة ...)
      details: { type: String },

      notes: { type: String },
    },

    // 💳 طريقة الدفع
    paymentMethod: {
      type: String,
      enum: ["COD", "Online", "Wallet"],
      default: "COD",
    },

    // 🧾 تفصيل الدفع الإلكتروني داخل Online
    // - CARD: دفع بالبطاقة
    // - BANK_TRANSFER: حوالة بنكية
    paymentSubMethod: {
      type: String,
      enum: ["CARD", "BANK_TRANSFER"],
    },

    // 🏦 بيانات الحوالة البنكية (تُستخدم فقط إذا paymentSubMethod = BANK_TRANSFER)
    bankTransferSenderName: { type: String, trim: true },
    bankTransferReferenceNumber: { type: String, trim: true },

    // ✅ حالة تأكيد الحوالة البنكية (يُحدَّث من الأدمن)
    // pending   → بانتظار التحقق
    // confirmed → تم التحقق من الحوالة وقبولها
    // rejected  → الحوالة مرفوضة
    bankTransferStatus: {
      type: String,
      enum: ["pending", "confirmed", "rejected"],
      default: "pending",
    },

    // 💰 إجمالي السعر للطلب بالكامل (منتجات + شحن)
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    // 💸 سعر الشحن فقط (يُستخدم لعرض "رسوم الشحن" في كرت الشحن)
    shippingPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    // 📌 حالة الطلب ككل (للتتبع العام – legacy)
    // تُستخدم حاليًا في الواجهات القائمة ولا نغيّرها حتى الآن.
    status: {
      type: String,
      enum: ["جديد", "قيد المعالجة", "قيد الشحن", "مكتمل", "ملغى"],
      default: "جديد",
    },

    // 🟡 حالة الطلب من زاوية البائع (قيم برمجية بالإنجليزية)
    // new, processing, ready_for_shipping, cancelled
    sellerStatus: {
      type: String,
      enum: ["new", "processing", "ready_for_shipping", "cancelled"],
      default: "new",
    },

    // 🔵 حالة الشحن من زاوية شركة الشحن (قيم برمجية بالإنجليزية)
    // pending_pickup, on_the_way, delivered, cancelled_shipping
    shippingStatus: {
      type: String,
      enum: [
        "pending_pickup",
        "on_the_way",
        "delivered",
        "cancelled_shipping",
        "cancelled_ship",
      ],
      default: "pending_pickup",
    },

    // 🧭 الحالة الموحدة على مستوى النظام (ثمانية أكواد)
    // لا تُكسر أي منطق قديم، بل تعيش بجانبه وتُستخدم في التطويرات الجديدة.
    statusCode: {
      type: String,
      enum: Object.values(ORDER_STATUS_CODES),
      default: ORDER_STATUS_CODES.AT_SELLER_NEW,
    },

    // 🔐 كود التسليم على مستوى الطلب (للتوافق مع المنطق السابق)
    // الكود الفعلي لكل منتج أصبح الآن داخل orderItems[].deliveryCode
    // لذا جعلناه اختياريًا مع قيمة افتراضية null
    deliveryCode: {
      type: String,
      required: false,
      default: null,
    },

    // 💸 معلومات الدفع
    isPaid: {
      type: Boolean,
      default: false,
    },
    paidAt: {
      type: Date,
    },

    // 📦 وقت اكتمال الطلب ككل (قد يختلف عن تسليم كل منتج على حدة)
    deliveredAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// 🔒 توليد أرقام الطلبات والعناصر تلقائياً قبل الحفظ
orderSchema.pre("save", async function (next) {
  // 1. توليد رقم الطلب الأساسي إذا لم يكن موجوداً
  if (!this.orderNumber) {
    // توليد رقم عشوائي فريد (6 أرقام كمثال)
    // ملاحظة: في الأنظمة الكبيرة نستخدم عداد تسلسلي أو مكتبة مثل nanoid
    this.orderNumber = Math.floor(100000 + Math.random() * 900000).toString();
  }

  // 2. توليد أرقام العناصر التسلسلية (789546I1, 789546I2...)
  if (this.orderItems && this.orderItems.length > 0) {
    this.orderItems.forEach((item, index) => {
      if (!item.itemNumber) {
        item.itemNumber = `${this.orderNumber}I${index + 1}`;
      }
    });
  }

  next();
});

// ✅ Indexes لتسريع الاستعلامات
// 1. استعلام سجل الحوالات البنكية في لوحة الأدمن
orderSchema.index({ paymentSubMethod: 1, createdAt: -1 });
// 2. استعلام طلبات مشتري محدد مرتبة بالتاريخ
orderSchema.index({ buyer: 1, createdAt: -1 });
// 3. استعلام طلبات بائع محدد
orderSchema.index({ seller: 1, createdAt: -1 });

// ✅ إنشاء النموذج
const Order = mongoose.model("Order", orderSchema);

export default Order;

// ────────────────────────────────────────────────
// ✅ يربط المشتري والبائع والمتجر وشركة الشحن.
// ✅ يحتوي على تفاصيل المنتجات مع حالة وتقييم لكل منتج.
// ✅ يحتوي على deliveryCode مستقل لكل منتج داخل الطلب.
// ✅ تمت إضافة sellerStatus و shippingStatus للفصل بين
//    حالة الطلب عند البائع وحالة الشحن عند شركة الشحن.
// ✅ تمت إضافة statusCode كحقل موحد للحالة على مستوى النظام
//    بجانب الحقول القديمة بدون كسر أي منطق حالي.
// ✅ تمت إضافة statusCode على مستوى كل منتج داخل الطلب
//    ليكون مصدر الحقيقة لحالة المنتج في كل الواجهات.
// ✅ تمت إضافة country/district/details في عنوان الشحن
//    مع حقل shippingPrice لسعر الشحن فقط.
// ✅ تمت إضافة selectedColor/selectedSize على مستوى عنصر الطلب
//    لحفظ اختيار المشتري (لون/حجم) إن وُجد.
// ────────────────────────────────────────────────
