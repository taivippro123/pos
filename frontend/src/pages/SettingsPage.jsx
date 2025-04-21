import React, { useState, useEffect } from 'react';
import { UserPlus, Key, Users, Pencil, Trash, X, Search } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const API_URL = import.meta.env.VITE_API_URL;

// Component for the confirmation toast
const ConfirmDeleteToast = ({ closeToast, staffId, proceedDelete }) => (
  <div>
    <p className="mb-2">Bạn có chắc chắn muốn xóa nhân viên này?</p>
    <div className="flex justify-end gap-2">
      <button 
        onClick={closeToast} 
        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
      >
        Hủy
      </button>
      <button 
        onClick={() => {
          proceedDelete(staffId);
          closeToast();
        }} 
        className="px-3 py-1 text-sm bg-rose-600 text-white rounded hover:bg-rose-700"
      >
        Xác nhận
      </button>
    </div>
  </div>
);

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('staff');
  const [staffList, setStaffList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'staff'
  });
  const [passwordChange, setPasswordChange] = useState({
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchStaffList();
    // Lấy thông tin user từ localStorage
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
      setPasswordChange(prev => ({
        ...prev,
        email: user.email
      }));
    } else {
      // Handle case where user is not logged in
      toast.error("Vui lòng đăng nhập để truy cập cài đặt.");
      // Redirect to login page or handle appropriately
      // window.location.href = '/login'; 
    }
  }, []);

  const fetchStaffList = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Không thể lấy danh sách nhân viên');
      }
      
      const data = await response.json();
      const staffList = data.filter(user => user.role !== 'customer');
      setStaffList(staffList);
    } catch (error) {
      console.error('Error fetching staff:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterStaff = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newStaff),
      });

      if (response.ok) {
        await fetchStaffList();
        setIsAddModalOpen(false);
        setNewStaff({
          name: '',
          email: '',
          phone: '',
          password: '',
          role: 'staff'
        });
        toast.success('Tạo tài khoản nhân viên thành công');
      } else {
        const data = await response.json();
        toast.error(data.message || 'Lỗi khi tạo tài khoản nhân viên');
      }
    } catch (error) {
      console.error('Error registering staff:', error);
      toast.error('Lỗi khi tạo tài khoản nhân viên');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStaff = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Vui lòng đăng nhập lại');
        // Consider redirecting or using a more robust auth handling mechanism
        // window.location.href = '/login';
        return;
      }

      const response = await fetch(`${API_URL}/users/${selectedStaff.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(selectedStaff),
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 401) {
          toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
          localStorage.removeItem('token');
          // Consider redirecting or using a more robust auth handling mechanism
          // window.location.href = '/login';
          return;
        }
        throw new Error(data.message || 'Lỗi khi cập nhật thông tin nhân viên');
      }

      await fetchStaffList();
      setIsEditModalOpen(false);
      setSelectedStaff(null);
      toast.success('Cập nhật thông tin nhân viên thành công');
    } catch (error) {
      console.error('Error updating staff:', error);
      toast.error(error.message || 'Lỗi khi cập nhật thông tin nhân viên');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle the actual deletion logic
  const proceedWithDelete = async (staffId) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Vui lòng đăng nhập lại');
        // Consider redirecting
        return;
      }

      const response = await fetch(`${API_URL}/users/${staffId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 401) {
          toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
          localStorage.removeItem('token');
          // Consider redirecting
          return;
        }
        throw new Error(data.message || 'Lỗi khi xóa nhân viên');
      }

      await fetchStaffList();
      toast.success('Xóa nhân viên thành công');
    } catch (error) {
      console.error('Error deleting staff:', error);
      toast.error(error.message || 'Lỗi khi xóa nhân viên');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteStaff = (staffId) => {
    toast(<ConfirmDeleteToast staffId={staffId} proceedDelete={proceedWithDelete} />, {
      position: "top-center",
      autoClose: false, // Don't auto close confirmation toasts
      closeOnClick: false, // Don't close on click
      draggable: false, // Don't allow dragging
      closeButton: true // Show a close button
    });
  };

  const handleChangePassword = async () => {
    try {
      setIsLoading(true);

      if (!passwordChange.currentPassword || !passwordChange.newPassword || !passwordChange.confirmPassword) {
        toast.warning('Vui lòng nhập đầy đủ thông tin');
        return;
      }

      if (passwordChange.newPassword !== passwordChange.confirmPassword) {
        toast.warning('Mật khẩu mới không khớp');
        return;
      }

      const response = await fetch(`${API_URL}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(passwordChange),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Đổi mật khẩu thành công');
        setPasswordChange({
          email: passwordChange.email, // Giữ nguyên email
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        toast.error(data.message || 'Lỗi khi đổi mật khẩu');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Lỗi khi đổi mật khẩu. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStaff = staffList.filter(staff => {
    return searchTerm === '' || 
      (staff.name && staff.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (staff.email && staff.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (staff.phone && staff.phone.includes(searchTerm));
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50/30">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50/30 min-h-screen">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Cài đặt</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('staff')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
              activeTab === 'staff'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Users size={20} />
            Nhân viên
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
              activeTab === 'security'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Key size={20} />
            Bảo mật
          </button>
        </div>
      </div>

      {/* Staff Management */}
      {activeTab === 'staff' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative flex-grow sm:flex-grow-0">
              <input
                type="text"
                placeholder="Tìm kiếm nhân viên..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2"
            >
              <UserPlus size={20} />
              Thêm nhân viên
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số điện thoại</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vai trò</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredStaff.map((staff) => (
                    <tr key={staff.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{staff.name}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{staff.email}</td>
                      <td className="px-6 py-4 text-gray-500">{staff.phone}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                          {staff.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedStaff(staff);
                              setIsEditModalOpen(true);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Chỉnh sửa"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteStaff(staff.id)}
                            className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title="Xóa"
                          >
                            <Trash size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Security Settings */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Đổi mật khẩu</h2>
          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 bg-gray-50"
                value={passwordChange.email}
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mật khẩu hiện tại
              </label>
              <input
                type="password"
                className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                value={passwordChange.currentPassword}
                onChange={(e) => setPasswordChange({...passwordChange, currentPassword: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mật khẩu mới
              </label>
              <input
                type="password"
                className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                value={passwordChange.newPassword}
                onChange={(e) => setPasswordChange({...passwordChange, newPassword: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Xác nhận mật khẩu mới
              </label>
              <input
                type="password"
                className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                value={passwordChange.confirmPassword}
                onChange={(e) => setPasswordChange({...passwordChange, confirmPassword: e.target.value})}
              />
            </div>
            <button
              onClick={handleChangePassword}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
            >
              Đổi mật khẩu
            </button>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-xl m-4">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800">Thêm nhân viên mới</h2>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setNewStaff({
                    name: '',
                    email: '',
                    phone: '',
                    password: '',
                    role: 'staff'
                  });
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên nhân viên
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                    value={newStaff.name}
                    onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                    value={newStaff.phone}
                    onChange={(e) => setNewStaff({...newStaff, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mật khẩu
                  </label>
                  <input
                    type="password"
                    className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                    value={newStaff.password}
                    onChange={(e) => setNewStaff({...newStaff, password: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vai trò
                  </label>
                  <select
                    className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                    value={newStaff.role}
                    onChange={(e) => setNewStaff({...newStaff, role: e.target.value})}
                  >
                    <option value="staff">Nhân viên</option>
                    <option value="admin">Quản trị viên</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setNewStaff({
                      name: '',
                      email: '',
                      phone: '',
                      password: '',
                      role: 'staff'
                    });
                  }}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
                >
                  Hủy
                </button>
                <button
                  onClick={handleRegisterStaff}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                >
                  Thêm mới
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {isEditModalOpen && selectedStaff && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-xl m-4">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800">Chỉnh sửa nhân viên</h2>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedStaff(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên nhân viên
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                    value={selectedStaff.name}
                    onChange={(e) => setSelectedStaff({...selectedStaff, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                    value={selectedStaff.email}
                    onChange={(e) => setSelectedStaff({...selectedStaff, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                    value={selectedStaff.phone}
                    onChange={(e) => setSelectedStaff({...selectedStaff, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vai trò
                  </label>
                  <select
                    className="w-full p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                    value={selectedStaff.role}
                    onChange={(e) => setSelectedStaff({...selectedStaff, role: e.target.value})}
                  >
                    <option value="staff">Nhân viên</option>
                    <option value="admin">Quản trị viên</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setSelectedStaff(null);
                  }}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
                >
                  Hủy
                </button>
                <button
                  onClick={handleUpdateStaff}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                >
                  Cập nhật
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage; 