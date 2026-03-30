// ────────────────────────────────────────────────
// 📁 backend/models/Synonym.js
// نموذج المرادفات لنظام البحث
// يسمح للإدارة بتعريف كلمات بديلة لنفس المعنى
// ────────────────────────────────────────────────

import mongoose from 'mongoose';

const synonymSchema = new mongoose.Schema(
    {
        // الكلمة الأساسية (التي سيبحث عنها النظام فعلياً)
        // مثال: "جوال"
        term: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },

        // قائمة المرادفات (التي قد يكتبها المستخدم)
        // مثال: ["هاتف", "موبايل", "تليفون", "سمارت فون"]
        synonyms: [{
            type: String,
            trim: true
        }],

        // هل هذا الربط فعال؟
        isActive: {
            type: Boolean,
            default: true
        },

        // ملاحظات للإدارة (اختياري)
        notes: {
            type: String
        }
    },
    {
        timestamps: true
    }
);

// فهرس لضمان سرعة البحث عن المرادفات
synonymSchema.index({ synonyms: 1 });

const Synonym = mongoose.model('Synonym', synonymSchema);

export default Synonym;
