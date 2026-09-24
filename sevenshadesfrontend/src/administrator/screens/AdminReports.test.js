import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SalesReport, SupportTickets, QuickDashboard } from './AdminReports';
import { getData, postData } from '../../services/FetchDjangoApiServices';
jest.mock('../../services/FetchDjangoApiServices',()=>({getData:jest.fn(),postData:jest.fn()}));
jest.mock('../../services/useOrderEvents',()=>()=>{});
test('sales filters reset the page and request filtered totals',async()=>{
 getData.mockResolvedValue({status:true,data:[],total:0,summary:{orders:0,collected:0,outstanding:0,completed:0,trial_collected:0,final_collected:0}});
 render(<SalesReport/>); await screen.findByText('No orders match these filters.');
 await act(async()=>{fireEvent.change(screen.getByLabelText('Search order, customer or city'),{target:{value:'Alice'}});});
 expect(getData).toHaveBeenLastCalledWith(expect.stringContaining('q=Alice'));
 await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Reset filters'}));});
 expect(getData).toHaveBeenLastCalledWith('admin_sales_report?page=1&page_size=20');
});
test('ticket table shows customer identity and saves a versioned response',async()=>{
 getData.mockResolvedValue({status:true,total:1,data:[{id:1,reference:'TKT-000001',subject:'Need help',message:'Delivery timing request',customer:{name:'Alice',mobile:'9000000000',email:'alice@example.test'},status:'Open',priority:'Normal',response:'',version:2,created_at:'2026-09-24'}]});postData.mockResolvedValue({status:true});
 render(<SupportTickets/>); await screen.findByText('alice@example.test');
 await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'View / update'}));});
 fireEvent.change(screen.getByLabelText('Customer-visible response'),{target:{value:'We are checking your order.'}});
 await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Save update'}));});
 expect(postData).toHaveBeenCalledWith('admin_ticket_update',{id:1,version:2,status:'Open',priority:'Normal',response:'We are checking your order.'});
});
test('dashboard shows real metrics and actionable support navigation',async()=>{
 getData.mockResolvedValue({status:true,data:{orders:4,collected:900,completed:2,unassigned:1,open_tickets:3,low_stock:1,active_riders:2,awaiting_approval:1,statuses:{TRY_REQUESTED:1},recent:[]}});
 render(<MemoryRouter><QuickDashboard/></MemoryRouter>);await screen.findByText('Action centre');
 expect(screen.getByRole('link',{name:/Open tickets/})).toHaveAttribute('href','/admindashboard/tickets');
});
