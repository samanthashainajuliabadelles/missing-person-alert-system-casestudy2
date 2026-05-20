import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function PasswordInput({
  label = 'Password',
  value,
  onChange,
  placeholder = 'Enter password',
  required = false,
  disabled = false,
  name = 'password'
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <label className="field">
      <span>{label}</span>

      <div className="password-input-wrap">
        <input
          name={name}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete={name === 'password' ? 'current-password' : 'new-password'}
        />

        <button
          type="button"
          className="password-toggle-btn"
          onClick={() => setShowPassword(prev => !prev)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          disabled={disabled}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </label>
  );
}