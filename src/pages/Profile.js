import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import { FiUser, FiCamera, FiSave, FiLock } from 'react-icons/fi';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [saving, setSaving] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const fileRef = useRef(null);

  const handleAvatar = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setAvatar(ev.target.result);
    reader.readAsDataURL(file);
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const res = await authAPI.updateProfile({ name, avatar });
      updateUser(res.data);
      toast.success('Profile updated');
    } catch (err) { toast.error(err.message || 'Failed to update'); }
    finally { setSaving(false); }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      toast.error('Passwords do not match'); return;
    }
    if (pwdForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters'); return;
    }
    try {
      await authAPI.changePassword({ currentPassword: pwdForm.currentPassword, newPassword: pwdForm.newPassword });
      toast.success('Password changed');
      setShowPwd(false);
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { toast.error(err.message || 'Failed to change password'); }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1><FiUser size={22} /> My Profile</h1>
      </div>

      <div className="profile-layout">
        <div className="profile-card">
          <div className="profile-avatar-section">
            <div className="profile-avatar" onClick={() => fileRef.current?.click()}>
              {avatar ? <img src={avatar} alt="avatar" /> : <FiUser size={48} />}
              <div className="avatar-overlay"><FiCamera size={20} /></div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatar} hidden />
            <span className="profile-email">{user?.email}</span>
            <span className="profile-role">{user?.role}</span>
          </div>

          <form onSubmit={saveProfile} className="profile-form">
            <div className="form-group">
              <label>Name</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={user?.email || ''} disabled />
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <FiSave size={14} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        <div className="profile-card">
          <h3><FiLock size={16} /> Change Password</h3>
          {showPwd ? (
            <form onSubmit={changePassword}>
              <div className="form-group">
                <label>Current Password</label>
                <input type="password" required value={pwdForm.currentPassword}
                  onChange={(e) => setPwdForm({ ...pwdForm, currentPassword: e.target.value })} />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input type="password" required value={pwdForm.newPassword}
                  onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input type="password" required value={pwdForm.confirmPassword}
                  onChange={(e) => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })} />
              </div>
              <div className="profile-actions">
                <button type="submit" className="btn btn-primary">Update Password</button>
                <button type="button" className="btn btn-outline" onClick={() => setShowPwd(false)}>Cancel</button>
              </div>
            </form>
          ) : (
            <button className="btn btn-outline" onClick={() => setShowPwd(true)} style={{ marginTop: 12 }}>
              <FiLock size={14} /> Change Password
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
