import "./Sidebar.css";

export default function Sidebar() {
  return (
    <aside className="sidebar-root">
      <div className="sidebar-title">تصفية سريعة</div>
      <div className="sidebar-item">العروض الخاصة</div>
      <div className="sidebar-item">الأكثر مبيعًا</div>
      <div className="sidebar-item">منتجات جديدة</div>
    </aside>
  );
}
