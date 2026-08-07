import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile, updateUserProfile, uploadAvatar } from '../api/auth';
import Layout from '../components/Common/Layout';

/* ── Icons ── */
const UserIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const MailIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
const PhoneIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
const BuildingIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="9" y1="6" x2="9.01" y2="6"/><line x1="15" y1="6" x2="15.01" y2="6"/><line x1="9" y1="10" x2="9.01" y2="10"/><line x1="15" y1="10" x2="15.01" y2="10"/><line x1="9" y1="14" x2="9.01" y2="14"/><line x1="15" y1="14" x2="15.01" y2="14"/><line x1="9" y1="18" x2="9.01" y2="18"/><line x1="15" y1="18" x2="15.01" y2="18"/></svg>;
const BriefcaseIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>;
const MapPinIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const EditIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const CheckIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>;
const ShieldCheckIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>;
const CameraIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>;

function LoadSpinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
        style={{ animation: 'spin 0.75s linear infinite', transformOrigin: 'center' }}/>
    </svg>
  );
}

export default function Profile() {
  const { user: authUser, updateUserState } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [organization, setOrganization] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [validationErrors, setValidationErrors] = useState({});

  const validateField = (name, value) => {
    let errs = { ...validationErrors };
    if (name === 'fullName') {
      if (!value) errs.fullName = 'Full Display Name is required';
      else if (value.length < 2) errs.fullName = 'Full Display Name must be at least 2 characters';
      else if (!/^[a-zA-Z\s\-\']+$/.test(value)) errs.fullName = 'Letters, spaces, hyphens, and apostrophes only';
      else delete errs.fullName;
    }
    if (name === 'email') {
      if (!value) errs.email = 'Email Address is required';
      else if (!/^[\w\.\+\-]+\@[\w\.\-]+\.[\w]{2,}$/.test(value)) errs.email = 'Invalid email address format';
      else delete errs.email;
    }
    if (name === 'phone') {
      if (value && !/^\+?[0-9\s\-()]{7,20}$/.test(value)) errs.phone = 'Invalid phone number format';
      else delete errs.phone;
    }
    if (name === 'avatarUrl') {
      if (value && !/^(https?:\/\/|\/)[^\s]*$/i.test(value)) errs.avatarUrl = 'Invalid avatar URL';
      else delete errs.avatarUrl;
    }
    setValidationErrors(errs);
  };

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Unsupported image type. Use JPG, PNG, GIF, or WEBP.' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image size exceeds maximum limit of 5MB.' });
      return;
    }

    setUploading(true);
    setMessage({ type: '', text: '' });

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await uploadAvatar(formData);
      setAvatarUrl(res.data.avatar_url);
      setMessage({ type: 'success', text: 'Avatar updated successfully!' });
      if (profileData) {
        const updated = {
          ...profileData,
          profile: {
            ...profileData.profile,
            avatar_url: res.data.avatar_url
          }
        };
        setProfileData(updated);
        updateUserState(updated);
      }
    } catch (err) {
      console.error("Avatar upload error:", err);
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to upload avatar image file.' });
    } finally {
      setUploading(false);
    }
  };

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await getUserProfile();
      const u = res.data;
      setProfileData(u);
      setFirstName(u.first_name || '');
      setLastName(u.last_name || '');
      
      const computedFullName = u.profile?.full_name || 
        `${u.first_name || ''} ${u.last_name || ''}`.trim() || 
        u.username || '';
      setFullName(computedFullName);

      setEmail(u.email || '');
      setPhone(u.profile?.phone || '');
      setOrganization(u.profile?.organization || '');
      setJobTitle(u.profile?.job_title || '');
      setLocation(u.profile?.location || '');
      setBio(u.profile?.bio || '');
      setAvatarUrl(u.profile?.avatar_url || '');
    } catch (err) {
      console.error("Profile fetch error:", err);
      if (authUser) {
        setProfileData(authUser);
        setFullName(authUser.full_name || authUser.username || '');
        setEmail(authUser.email || '');
        if (authUser.profile) {
          setPhone(authUser.profile.phone || '');
          setOrganization(authUser.profile.organization || '');
          setJobTitle(authUser.profile.job_title || '');
          setLocation(authUser.profile.location || '');
          setBio(authUser.profile.bio || '');
          setAvatarUrl(authUser.profile.avatar_url || '');
        }
      } else {
        setMessage({ type: 'error', text: 'Failed to retrieve profile data.' });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();

    validateField('fullName', fullName);
    validateField('email', email);
    validateField('phone', phone);
    validateField('avatarUrl', avatarUrl);

    const hasErrors = !fullName || !email || 
      validationErrors.fullName || validationErrors.email || validationErrors.phone || validationErrors.avatarUrl;

    if (hasErrors) {
      setMessage({ type: 'error', text: 'Please correct all validation errors before saving.' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    const payload = {
      first_name: firstName,
      last_name: lastName,
      email: email,
      full_name: fullName,
      phone: phone,
      organization: organization,
      job_title: jobTitle,
      location: location,
      bio: bio,
      avatar_url: avatarUrl
    };

    try {
      const res = await updateUserProfile(payload);
      setProfileData(res.data);
      updateUserState(res.data);
      setIsEditing(false);
      setMessage({ type: 'success', text: 'Profile details saved successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update profile details.' });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = () => {
    if (fullName) return fullName.slice(0, 2).toUpperCase();
    if (profileData?.username) return profileData.username.slice(0, 2).toUpperCase();
    return 'OP';
  };

  return (
    <Layout>
      <main style={{
        maxWidth: '1000px',
        width: '100%',
        margin: '0 auto',
        padding: 'clamp(24px, 4vw, 48px) clamp(16px, 4vw, 24px)',
      }}>
        {/* Alerts */}
        {message.text && (
          <div className="anim-fadeDown" style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '14px 18px', borderRadius: 'var(--r-md)', marginBottom: '24px',
            background: message.type === 'error' ? 'var(--c-error-light)' : 'var(--c-success-light)',
            border: `1px solid ${message.type === 'error' ? 'var(--c-error)' : 'var(--c-success)'}`,
            color: 'var(--text-primary)',
            fontSize: '13.5px', fontWeight: '600'
          }}>
            <span>{message.type === 'error' ? '️' : ''}</span>
            <span>{message.text}</span>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '16px', color: 'var(--text-muted)' }}>
            <LoadSpinner />
            <p style={{ fontSize: '14px', fontWeight: '600' }}>Retrieving operator profile...</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '28px',
            alignItems: 'start'
          }}>
            
            {/* Left Box: avatar details */}
            <div className="card" style={{
              borderRadius: 'var(--r-xl)', padding: '36px 24px', textAlign: 'center',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}>
              {/* Avatar Box */}
              <div style={{ position: 'relative', marginBottom: '20px' }}>
                <div style={{
                  width: '110px', height: '110px', borderRadius: '50%',
                  background: 'var(--c-primary-100)', padding: '3px',
                  boxShadow: 'var(--shadow-md)'
                }}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%', borderRadius: '50%',
                      background: 'var(--bg-elevated)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      fontSize: '32px', fontWeight: '950', color: 'var(--c-primary-600)'
                    }}>
                      {getInitials()}
                    </div>
                  )}
                </div>

                {isEditing && (
                  <>
                    <label
                      htmlFor="avatar-upload-field"
                      style={{
                        position: 'absolute', bottom: '2px', right: '2px',
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: 'var(--c-primary-500)', color: 'var(--text-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', boxShadow: 'var(--shadow-sm)',
                        transition: 'transform 0.2s',
                      }}
                      title="Upload Avatar File"
                    >
                      {uploading ? <LoadSpinner /> : <CameraIcon />}
                    </label>
                    <input
                      id="avatar-upload-field"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFileChange}
                      disabled={uploading}
                      style={{ display: 'none' }}
                    />
                  </>
                )}
              </div>

              {validationErrors.avatarUrl && (
                <span style={{ fontSize: '11px', color: 'var(--c-error)', display: 'block', marginBottom: '12px' }}>
                  {validationErrors.avatarUrl}
                </span>
              )}

              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: '850', marginBottom: '2px', letterSpacing: '-0.02em' }}>
                {fullName || profileData?.username}
              </h2>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '20px', fontWeight: '600' }}>
                @{profileData?.username}
              </p>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '24px' }}>
                <span className="badge badge-cyan" style={{ border: '1px solid var(--c-primary-300)' }}>
                  <ShieldCheckIcon /> Verified Operator
                </span>
                {organization && (
                  <span className="badge badge-purple">{organization}</span>
                )}
              </div>

              {bio && (
                <div style={{
                  padding: '14px', borderRadius: 'var(--r-md)',
                  background: 'var(--c-surface-hover)', border: '1px solid var(--border-subtle)',
                  fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5,
                  textAlign: 'center', width: '100%', fontStyle: 'italic'
                }}>
                  "{bio}"
                </div>
              )}
            </div>

            {/* Right Box: forms input detail */}
            <div className="card" style={{
              borderRadius: 'var(--r-xl)', padding: 'clamp(20px, 4vw, 36px)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: '850', margin: 0, letterSpacing: '-0.02em' }}>
                    Personal Specifications
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                    View and update your profile metadata details.
                  </p>
                </div>

                {!isEditing ? (
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setIsEditing(true)}
                    style={{ gap: '6px', padding: '8px 14px' }}
                  >
                    <EditIcon /> Edit Specifications
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => { setIsEditing(false); setMessage({ type: '', text: '' }); }}
                    style={{ gap: '6px', padding: '8px 14px', borderColor: 'var(--text-muted)' }}
                  >
                    Cancel
                  </button>
                )}
              </div>

              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Full Display Name</label>
                    <div className="form-input-wrapper">
                      <span className="form-input-icon"><UserIcon /></span>
                      <input
                        type="text"
                        value={fullName}
                        onChange={e => { setFullName(e.target.value); validateField('fullName', e.target.value); }}
                        className="form-input-field"
                        style={{ paddingLeft: '40px' }}
                        disabled={!isEditing}
                        required
                      />
                    </div>
                    {validationErrors.fullName && (
                      <span style={{ fontSize: '11px', color: 'var(--c-error)', display: 'block' }}>{validationErrors.fullName}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <div className="form-input-wrapper">
                      <span className="form-input-icon"><MailIcon /></span>
                      <input
                        type="email"
                        value={email}
                        onChange={e => { setEmail(e.target.value); validateField('email', e.target.value); }}
                        className="form-input-field"
                        style={{ paddingLeft: '40px' }}
                        disabled={!isEditing}
                        required
                      />
                    </div>
                    {validationErrors.email && (
                      <span style={{ fontSize: '11px', color: 'var(--c-error)', display: 'block' }}>{validationErrors.email}</span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <div className="form-input-wrapper">
                      <span className="form-input-icon"><PhoneIcon /></span>
                      <input
                        type="text"
                        placeholder="+91 99999 99999"
                        value={phone}
                        onChange={e => { setPhone(e.target.value); validateField('phone', e.target.value); }}
                        className="form-input-field"
                        style={{ paddingLeft: '40px' }}
                        disabled={!isEditing}
                      />
                    </div>
                    {validationErrors.phone && (
                      <span style={{ fontSize: '11px', color: 'var(--c-error)', display: 'block' }}>{validationErrors.phone}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Location / Hub</label>
                    <div className="form-input-wrapper">
                      <span className="form-input-icon"><MapPinIcon /></span>
                      <input
                        type="text"
                        placeholder="Gandhinagar, Gujarat"
                        value={location}
                        onChange={e => setLocation(e.target.value)}
                        className="form-input-field"
                        style={{ paddingLeft: '40px' }}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Organization Name</label>
                    <div className="form-input-wrapper">
                      <span className="form-input-icon"><BuildingIcon /></span>
                      <input
                        type="text"
                        placeholder="GIDC Development Corporation"
                        value={organization}
                        onChange={e => setOrganization(e.target.value)}
                        className="form-input-field"
                        style={{ paddingLeft: '40px' }}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Job Title / Designation</label>
                    <div className="form-input-wrapper">
                      <span className="form-input-icon"><BriefcaseIcon /></span>
                      <input
                        type="text"
                        placeholder="GIS Siting Architect"
                        value={jobTitle}
                        onChange={e => setJobTitle(e.target.value)}
                        className="form-input-field"
                        style={{ paddingLeft: '40px' }}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Operator Bio Summary</label>
                  <textarea
                    placeholder="Provide a brief summary profile statement..."
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    className="form-input-field"
                    style={{ minHeight: '80px', paddingLeft: '16px', resize: 'vertical' }}
                    disabled={!isEditing}
                  />
                </div>

                {isEditing && (
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary"
                    style={{ padding: '14px', width: '100%', fontSize: '13.5px', marginTop: '6px' }}
                  >
                    {saving ? <><LoadSpinner /> Saving Specifications...</> : <><CheckIcon /> Save Specifications</>}
                  </button>
                )}
              </form>
            </div>

          </div>
        )}
      </main>
    </Layout>
  );
}
