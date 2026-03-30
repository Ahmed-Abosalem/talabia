import { Outlet } from "react-router-dom";
import "./BuyerLayout.css";

export default function BuyerLayout() {
    return (
        <div className="buyer-layout">
            {/* محتوى الصفحات الفرعية (طلباتي، الملف الشخصي، إلخ) */}
            <main className="buyer-layout-content">
                <Outlet />
            </main>
        </div>
    );
}
