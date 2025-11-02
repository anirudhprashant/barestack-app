
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import api from '../services/api';

const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const data = await api.post('/auth/register', { email, password, fullName, companyName });
      if (data.userId) {
        setSuccess('Registration successful! Please log in.');
        setTimeout(() => navigate('/'), 2000);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    }
  };

  return (
    <div className="min-h-screen bg-brand-light flex flex-col items-center justify-center font-sans p-4">
      <div className="w-full max-w-sm bg-white p-8 rounded-[10px] border-2 border-brand-dark shadow-neo">
        <h1 className="text-4xl font-black text-brand-dark text-center mb-2">Create Account</h1>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        {success && <p className="text-green-500 text-center mb-4">{success}</p>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-brand-dark font-bold mb-2" htmlFor="fullName">Full Name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} id="fullName" type="text" className="w-full p-3 bg-white text-brand-dark rounded-[10px] border-2 border-brand-dark" />
          </div>
          <div className="mb-4">
            <label className="block text-brand-dark font-bold mb-2" htmlFor="companyName">Company Name</label>
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} id="companyName" type="text" className="w-full p-3 bg-white text-brand-dark rounded-[10px] border-2 border-brand-dark" />
          </div>
          <div className="mb-4">
            <label className="block text-brand-dark font-bold mb-2" htmlFor="email">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} id="email" type="email" className="w-full p-3 bg-white text-brand-dark rounded-[10px] border-2 border-brand-dark" />
          </div>
          <div className="mb-6">
            <label className="block text-brand-dark font-bold mb-2" htmlFor="password">Password</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} id="password" type="password" className="w-full p-3 bg-white text-brand-dark rounded-[10px] border-2 border-brand-dark" />
          </div>
          <button type="submit" className="w-full bg-brand-dark text-white font-bold py-3 px-4 rounded-[10px] border-2 border-brand-dark shadow-neo-sm">
            Sign Up
          </button>
        </form>
        <p className="mt-4 text-center">
          Already have an account? <NavLink to="/" className="font-bold text-brand-dark hover:underline">Log in</NavLink>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
