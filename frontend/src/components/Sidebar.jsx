import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  MenuSquare,
  ClipboardList,
  Package,
  Users,
  BarChart2,
  Settings,
  LogOut 
} from "lucide-react";

const Sidebar = ({ onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { icon: <MenuSquare size={20} />, label: "Menu", path: "/" },
    { icon: <ClipboardList size={20} />, label: "Order", path: "/orders" },
    { icon: <Package size={20} />, label: "Inventory", path: "/inventory" },
    { icon: <Users size={20} />, label: "Customer", path: "/customer" },
    { icon: <BarChart2 size={20} />, label: "Report", path: "/report" },
    { icon: <Settings size={20} />, label: "Settings", path: "/settings" }
  ];

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <div className="w-[280px] bg-white border-r border-gray-200 p-6 space-y-8">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold text-gray-800">POS Management</h1>
      </div>

      <nav className="space-y-1">
        {menuItems.map((item, index) => (
          <div 
            key={index} 
            className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors ${
              location.pathname === item.path
                ? "bg-gray-100 text-gray-900"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
            onClick={() => navigate(item.path)}
          >
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </div>
        ))}
      </nav>

      <div className="pt-4 border-t border-gray-200">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-500 hover:bg-red-50 w-full transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
