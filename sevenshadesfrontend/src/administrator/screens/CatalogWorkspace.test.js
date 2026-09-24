import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CatalogWorkspace from './CatalogWorkspace';
import { getData, postData } from '../../services/FetchDjangoApiServices';
jest.mock('../../services/FetchDjangoApiServices',()=>({getData:jest.fn(),postData:jest.fn()}));
const category={id:1,maincategoryname:'Clothing'},sub={id:2,maincategoryid:1,subcategoryname:'Shirts'},brand={id:3,brandname:'Test brand'};
const product={id:4,maincategoryid:category,subcategoryid:sub,brandid:brand,productname:'Cotton shirt',description:'Cotton',icon:''};
const variant={id:5,maincategoryid:category,subcategoryid:sub,brandid:brand,productid:product,productsubname:'Blue M',description:'Cotton',qty:4,price:500,offerprice:0,color:'Blue',size:'M',offertype:'None',icon:''};
beforeEach(()=>{jest.clearAllMocks();getData.mockImplementation(async endpoint=>({status:true,data:{maincategory_list:[category,{id:9,maincategoryname:'Shoes'}],mysubcategory_list:[sub],brand_list:[brand],product_list:[product],productdetails_list:[variant]}[endpoint]}));postData.mockResolvedValue({status:true,message:'Saved'});URL.createObjectURL=jest.fn(()=> 'blob:preview');URL.revokeObjectURL=jest.fn();});
function show(props){render(<MemoryRouter><CatalogWorkspace {...props}/></MemoryRouter>);}
async function choose(label,value){fireEvent.mouseDown(screen.getByRole('combobox',{name:label}));fireEvent.click(await screen.findByRole('option',{name:value}));}
test('variant form only requests valid lists and resets dependent selections',async()=>{
 show({variant:true});await screen.findByLabelText('Variant name');
 expect(postData).not.toHaveBeenCalled();
 await choose('Category','Clothing');await choose('Subcategory','Shirts');await choose('Product','Cotton shirt');
 expect(screen.getByLabelText('Brand')).toHaveTextContent('Test brand');
 await choose('Category','Shoes');expect(screen.getByRole('combobox',{name:'Product'})).not.toHaveTextContent('Cotton shirt');
 fireEvent.change(screen.getByLabelText('Product images'),{target:{files:[new File(['x'],'shirt.png',{type:'image/png'})]}});
 fireEvent.click(screen.getByRole('button',{name:'Reset'}));expect(screen.queryByAltText('Product image 1')).not.toBeInTheDocument();expect(screen.getByLabelText('Variant name')).toHaveValue('');
});
test('existing variant loads hierarchy and submits zero offer with stock snapshot',async()=>{
 show({variant:true,list:true});fireEvent.click(await screen.findByRole('button',{name:'Edit'}));
 expect(screen.getByRole('combobox',{name:'Product'})).toHaveTextContent('Cotton shirt');
 fireEvent.change(screen.getByLabelText('Quantity'),{target:{value:'0'}});fireEvent.click(screen.getByRole('button',{name:'Save details'}));
 await waitFor(()=>expect(postData).toHaveBeenCalledWith('editproductdetails_data',expect.objectContaining({id:5,expected_qty:4,qty:'0',offerprice:0,size:'M'}))); await screen.findByText('Saved');
});
test('list search and delete errors are visible',async()=>{
 show({list:true});await screen.findByText('Cotton shirt');fireEvent.change(screen.getByLabelText('Search products'),{target:{value:'missing'}});expect(screen.getByText('No products match these filters.')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Reset filters'}));postData.mockResolvedValue({status:false,message:'This product has variants.'});fireEvent.click(screen.getByRole('button',{name:'Delete'}));fireEvent.click(screen.getByRole('button',{name:'Confirm delete'}));await screen.findByText('This product has variants.');expect(screen.getByText('Cotton shirt')).toBeInTheDocument();
});
test('failed catalog loads offer retry without crashing',async()=>{
 getData.mockResolvedValue({status:false,message:'Offline'});show({variant:true});await screen.findByText('Offline');expect(screen.getByRole('button',{name:'Retry'})).toBeInTheDocument();
});
