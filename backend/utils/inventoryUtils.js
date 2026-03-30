import Product from "../models/Product.js";

/**
 * يعيد المخزون للمنتجات عند إلغاء الطلب أو العناصر
 * ويقوم بإعادة التفعيل التلقائي إذا كان المنتج قد عُطل برمجياً
 * @param {Array} items - مصفوفة من عناصر الطلب (يجب أن تحتوي على product و qty)
 */
export const returnStock = async (items) => {
    if (!items || !Array.isArray(items)) return;

    for (const item of items) {
        try {
            if (!item || !item.product) continue;

            const productId = item.product._id || item.product;
            const qty = Number(item.qty || 0);

            if (qty <= 0) continue;

            const product = await Product.findById(productId);
            if (!product) continue;

            const newStock = product.stock + qty;
            const update = { $inc: { stock: qty } };
            const setFields = {};

            // ✅ إعادة التفعيل التلقائي: فقط إذا كان autoDeactivated = true والمخزون أصبح موجباً
            if (product.autoDeactivated && newStock > 0) {
                setFields.isActive = true;
                setFields.status = "active";
                setFields.autoDeactivated = false;
            }

            // ✅ إعادة ضبط علم "تم التنبيه": إذا أصبح المخزون فوق العتبة
            if (newStock > product.lowStockThreshold && product.lowStockNotified) {
                setFields.lowStockNotified = false;
            }

            if (Object.keys(setFields).length > 0) {
                update.$set = setFields;
            }

            await Product.updateOne({ _id: productId }, update);
        } catch (error) {
            console.error(`فشل إعادة المخزون للمنتج ${item.product}:`, error.message);
        }
    }
};
