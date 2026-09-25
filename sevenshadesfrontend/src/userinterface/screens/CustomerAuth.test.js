import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import CustomerAuth from './CustomerAuth';
import RootReducer from '../../storage/RootReducer';
import { getData, postData } from '../../services/FetchDjangoApiServices';
jest.mock('../../services/FetchDjangoApiServices', () => ({getData:jest.fn(),postData:jest.fn(),clearCachedAccounts:jest.fn()}));
function show(kind='login') { render(<Provider store={createStore(RootReducer)}><MemoryRouter initialEntries={['/auth']}><Routes><Route path="/auth" element={<CustomerAuth kind={kind} />} /><Route path="/home" element={<div>Signed in home</div>} /><Route path="/signindisplay" element={<div>Sign in after verification</div>} /></Routes></MemoryRouter></Provider>); }
function fill(label,value) { fireEvent.change(screen.getByLabelText(label),{target:{value}}); }
beforeEach(()=>{getData.mockResolvedValue({status:true,data:{available:true,test_mode:true}});postData.mockReset();});
test('invalid login fields show inline errors without a request', async()=>{
  show(); await screen.findByText('Welcome back.');
  fill(/Mobile number/,'123'); fill(/^Password/,'test');
  await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Sign in',exact:true}));});
  expect(await screen.findByText(/10-digit mobile/)).toBeInTheDocument(); expect(postData).not.toHaveBeenCalled();
});
test('OTP login requires a request before verification and establishes login',async()=>{
  postData.mockImplementation(async endpoint=>endpoint==='auth/send-otp/'?{status:true,data:{resend_after:60,expires_in:300}}:{status:true,data:[{mobileno:'9000000091',fname:'Test'}]});
  show(); await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Login with OTP'}));});
  fill(/Mobile number/,'9000000091');
  await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Get OTP'}));});
  expect(postData).toHaveBeenCalledWith('auth/send-otp/',{phone:'9000000091'});
  fill(/6-digit OTP/,'123456');
  await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Verify & sign in'}));});
  expect(postData).toHaveBeenCalledWith('auth/verify-otp/',{phone:'9000000091',otp:'123456'});
  expect(await screen.findByText('Signed in home')).toBeInTheDocument();
});
test('signup rejects mismatched confirmation before issuing an OTP',async()=>{
  show('signup'); await screen.findByText(/Development mode/);
  fill(/First name/,'New');fill(/Last name/,'User');fill(/Mobile number/,'9000000091');fill(/Email address/,'new@example.test');fill(/^Password/,'Strong-example!');fill(/Confirm password/,'different');
  await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Get OTP'}));});
  expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();expect(postData).not.toHaveBeenCalled();
});
test('forgot password verifies reset-specific challenge and new password',async()=>{
  postData.mockImplementation(async endpoint=>endpoint==='otp_request'?{status:true,data:{challenge_id:'reset-challenge',resend_after:60,expires_in:300}}:{status:true,message:'Password reset.'});
  show('reset'); await screen.findByText(/Development mode/);
  fill(/Mobile number/,'9000000091');fill(/New password/,'Changed-example!');fill(/Confirm password/,'Changed-example!');
  await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Get OTP'}));});
  fill(/6-digit OTP/,'123456');
  await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Verify & reset password'}));});
  expect(postData).toHaveBeenCalledWith('reset_password',{mobileno:'9000000091',otp:'123456',challenge_id:'reset-challenge',password:'Changed-example!',confirm_password:'Changed-example!'});
  expect(await screen.findByText('Sign in after verification')).toBeInTheDocument();
});
