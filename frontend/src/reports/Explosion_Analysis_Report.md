# تقرير تحليل خلل تضخم كروت المنتجات (Explosion Report)

## 1. ملخص المشكلة
فقدان شبكة المنتجات (Product Grid) بالصفحة الرئيسية لخصائص العرض الصحيحة (2 كرت بالصف)، مما يؤدي إلى تمدد الكرت ليحتل عرض الشاشة بالكامل (أو أكثر)، وهو ما يُعرف بـ "انفجار الـ Layout".

## 2. التحليل التقني للكود

### أ. ملف `Home.jsx`
- يستخدم الـ Component حاوية `div` بالفئة `products-grid` لعرض المنتجات.
- يتم استدعاء `ProductCard` داخل `div` بالفئة `product-card-wrapper`.
```jsx
<div className="products-grid">
  {/* ... */}
  <div className="product-card-wrapper">
    <ProductCard product={product} />
  </div>
</div>
```

### ب. ملف `Home.css`
- الفئة `.products-grid` معرّفة كـ Grid مع عمودين:
```css
.products-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
    padding: 0.5rem 0.75rem 2rem;
    direction: rtl;
}
```
- نظرياً، هذا الكود صحيح ويجب أن ينتج عمودين متساويين (50% لكل منهما).

### ج. ملف `ProductCard.css`
- الفئة `.product-card` تأخذ `width: 100%`.
```css
.product-card {
  width: 100%;
  /* ... */
}
```
- هذا يعني أن الكرت سيملأ الحاوية الأب (`product-card-wrapper`) التي تملأ خلية الـ Grid.

## 3. الأسباب المحتملة للخلل (Root Cause Analysis)

بناءً على الأعراض (تضخم الكرت وانفجار الشبكة)، الاحتمالات هي:

1.  **تعطيل خاصية `display: grid`**: إذا فقدت الحاوية `products-grid` خاصية `display: grid` لسبب ما (Override أو خطأ في التحميل)، ستعود إلى `display: block` (الافتراضي للـ div). في هذه الحالة، ستأخذ العناصر الأبناء (`product-card-wrapper`) عرض 100% من الشاشة، وهو ما يطابق الوصف تماماً.

2.  **تداخل التنسيقات (Full Bleed Conflict)**:
    - يتم استخدام تقنية "Full Bleed" في `.products-section`:
    ```css
    width: 100vw;
    margin-left: -50vw;
    left: 50%;
    ```
    - إذا حدث أي خطأ في حسابات الـ viewport (خاصة على الموبايل مع وجود scrollbar)، قد يتسبب ذلك في تجاوز العرض 100%، لكنه لا يفسر تحول الشبكة إلى عمود واحد إلا إذا كان الـ Grid نفسه قد تضرر.

3.  **قواعد CSS محددة غير مطبقة**:
    - يوجد في `Home.css` قواعد مخصصة لـ `.products-row > *` تحدد العرض بـ `50% - Gap`.
    ```css
    @media (max-width: 479px) {
        .products-row>* {
            width: calc(50% - 0.375rem);
            flex: 0 0 calc(50% - 0.375rem);
        }
    }
    ```
    - **الملاحظة:** هذه القواعد تستهدف `.products-row` وليس `.products-grid`. بما أن `Home.jsx` يستخدم `products-grid`، فإن هذه القواعد "الصلبة" (Hard Constraints) لا تطبق، ويعتمد الكود كلياً على `grid-template-columns`. إذا فشل الـ Grid لأي سبب، لا يوجد Fallback يمنع الكرت من التضخم.

4.  **تأثيرات جانبية من صفحات أخرى**:
    - لوحظ وجود تنسيقات "Global" قوية في `ProductDetails.css` و `SellerProductsSection.css`. رغم أنها تبدو معزولة (Scoped) بأسماء فئات مختلفة، إلا أن أي تسرب لتنسيق يستهدف `div` أو `img` بشكل عام قد يؤثر. (احتمال ضعيف لكن وارد).

## 4. الحل المقترح (Remediation Plan)

لإصلاح المشكلة بشكل جذري ومنع تكرارها، يجب تعزيز قيود العرض (CSS Constraints) على الكروت في الـ Grid أيضاً، وعدم الاعتماد فقط على `grid-template-columns`.

### الخطوات:
1.  تحديث `Home.css` لضمان تطبيق `repeat(2, 1fr)` بقوة (`!important` إذا لزم الأمر في مرحلة التصحيح).
2.  إضافة قاعدة احتياطية (Fallback) لـ `.products-grid > *` أو `.product-card-wrapper` لتحديد `max-width: 50%` أو استخدام `flex` كبديل آمن.
3.  ضبط `min-width: 0` للحاويات لمنع المحتوى الداخلي (مثل الصور أو النصوص الطويلة) من كسر عرض الخلية.

**الحل السريع (Code Snippet to Apply):**
تعديل `Home.css` لإجبار العناصر داخل الـ Grid على الالتزام بالعرض:

```css
/* Home.css */
.products-grid {
    display: grid;
    /* ضمان وجود عمودين دائماً على الموبايل */
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 0.75rem;
    /* ... */
}

/* حل مشكلة الانفجار: منع العناصر من تجاوز عرض الخلية */
.products-grid > .product-card-wrapper {
    min-width: 0; /* يسمح للعنصر بالانكماش إذا لزم الأمر */
    width: 100%;
    /* حماية إضافية */
    max-width: 100%; 
}
```

هذا التحليل يؤكد أن المشكلة تكمن في ضعف "قيود العرض" (CSS Constraints) الخاصة بالشبكة في مواجهة الظروف غير المتوقعة (مثل فشل تحميل الـ Grid أو تداخل التنسيقات).
