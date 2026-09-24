import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PaymentRecovery from './PaymentRecovery';
import { getData, postData } from '../../services/FetchDjangoApiServices';
jest.mock('../../services/FetchDjangoApiServices',()=>({getData:jest.fn(),postData:jest.fn()}));
const row={order_id:'TRL1',mobile:'9000000000',status:'AWAITING_TRIAL_PAYMENT',try_fee:99,can_cancel:false,cancellation_blocker:'Payment needs verification.',attempts:[{id:7,purpose:'trial',state:'REVIEW',amount_paise:9900,receipt_reference:'SS-reference',gateway_order_id:null}]};
beforeEach(()=>{jest.clearAllMocks();getData.mockResolvedValue({status:true,data:[row],total:1});postData.mockResolvedValue({status:true,data:{state:'READY',message:'Same payment can resume.'}});});
test('recover uses the original provider ID and displays result',async()=>{
 render(<PaymentRecovery/>);await screen.findByText(/SS-reference/);
 const button=screen.getByRole('button',{name:'Verify and recover original payment'});expect(button).toBeDisabled();
 fireEvent.change(screen.getByLabelText('Original Razorpay order ID for attempt 7'),{target:{value:'order_Original'}});fireEvent.click(button);
 await screen.findByText('Same payment can resume.');expect(postData).toHaveBeenCalledWith('admin_recover_payment',{attempt_id:7,gateway_order_id:'order_Original'});
 expect(screen.queryByRole('button',{name:'Cancel before dispatch'})).not.toBeInTheDocument();
});
test('safe expiration action shows the released count',async()=>{
 postData.mockResolvedValue({status:true,data:{expired:2}});render(<PaymentRecovery/>);await screen.findByText(/SS-reference/);fireEvent.click(screen.getByRole('button',{name:'Release safe expired reservations'}));await screen.findByText('2 safe reservations released.');expect(postData).toHaveBeenCalledWith('admin_expire_reservations',{});
});
test('recovery failure is displayed without claiming payment success',async()=>{
 postData.mockResolvedValue({status:false,message:'Provider order does not match.'});render(<PaymentRecovery/>);await screen.findByText(/SS-reference/);fireEvent.change(screen.getByLabelText('Original Razorpay order ID for attempt 7'),{target:{value:'order_Wrong'}});fireEvent.click(screen.getByRole('button',{name:'Verify and recover original payment'}));await screen.findByText('Provider order does not match.');await waitFor(()=>expect(getData).toHaveBeenCalledTimes(2));
});
