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

test('size variant matrix: selection, data retention on removal, and validation', async () => {
  show({ variant: true });
  await screen.findByLabelText('Variant name');

  // Fill shared fields
  await choose('Category', 'Clothing');
  await choose('Subcategory', 'Shirts');
  await choose('Product', 'Cotton shirt');
  fireEvent.change(screen.getByLabelText('Variant name'), { target: { value: 'Red Casual' } });
  fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Casual shirt' } });
  fireEvent.change(screen.getByLabelText('Colour'), { target: { value: 'Red' } });
  fireEvent.change(screen.getByLabelText('Offer type'), { target: { value: 'None' } });

  // 1. Single size select (S) -> exactly 1 row
  fireEvent.click(screen.getByText('S'));
  expect(screen.getByLabelText('Stock for S')).toBeInTheDocument();
  expect(screen.queryByLabelText('Stock for M')).not.toBeInTheDocument();

  // 2. Select M, L, Free Size -> matching rows render
  fireEvent.click(screen.getByText('M'));
  fireEvent.click(screen.getByText('L'));
  fireEvent.click(screen.getByText('Free Size'));
  expect(screen.getByLabelText('Stock for S')).toBeInTheDocument();
  expect(screen.getByLabelText('Stock for M')).toBeInTheDocument();
  expect(screen.getByLabelText('Stock for L')).toBeInTheDocument();
  expect(screen.getByLabelText('Stock for Free Size')).toBeInTheDocument();

  // Enter data in S, M, L
  fireEvent.change(screen.getByLabelText('Stock for S'), { target: { value: '20' } });
  fireEvent.change(screen.getByLabelText('Price for S'), { target: { value: '499' } });
  fireEvent.change(screen.getByLabelText('SKU for S'), { target: { value: 'RED-S' } });

  fireEvent.change(screen.getByLabelText('Stock for M'), { target: { value: '35' } });
  fireEvent.change(screen.getByLabelText('Price for M'), { target: { value: '499' } });
  fireEvent.change(screen.getByLabelText('SKU for M'), { target: { value: 'RED-M' } });

  fireEvent.change(screen.getByLabelText('Stock for L'), { target: { value: '10' } });
  fireEvent.change(screen.getByLabelText('Price for L'), { target: { value: '549' } });
  fireEvent.change(screen.getByLabelText('SKU for L'), { target: { value: 'RED-L' } });

  // 3. Remove M via Remove button
  fireEvent.click(screen.getByLabelText('Remove M'));
  expect(screen.queryByLabelText('Stock for M')).not.toBeInTheDocument();

  // Verify Data Retention: S and L data still intact
  expect(screen.getByLabelText('Stock for S')).toHaveValue(20);
  expect(screen.getByLabelText('Price for S')).toHaveValue(499);
  expect(screen.getByLabelText('SKU for S')).toHaveValue('RED-S');
  expect(screen.getByLabelText('Stock for L')).toHaveValue(10);
  expect(screen.getByLabelText('Price for L')).toHaveValue(549);
  expect(screen.getByLabelText('SKU for L')).toHaveValue('RED-L');

  // 4. Remove Free Size via chip toggle
  fireEvent.click(screen.getAllByText('Free Size')[0]);
  expect(screen.queryByLabelText('Stock for Free Size')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Stock for S')).toHaveValue(20);

  // 5. Validation: Blank price in S
  fireEvent.change(screen.getByLabelText('Price for S'), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: /Create.*variant/i }));
  expect(await screen.findByText('Enter a price (1 or more) for every size.')).toBeInTheDocument();
  expect(postData).not.toHaveBeenCalled();

  // Validation: Blank stock in S
  fireEvent.change(screen.getByLabelText('Price for S'), { target: { value: '499' } });
  fireEvent.change(screen.getByLabelText('Stock for S'), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: /Create.*variant/i }));
  expect(await screen.findByText('Enter stock (0–100000) for every size.')).toBeInTheDocument();
  expect(postData).not.toHaveBeenCalled();

  // Fix S, and attach image
  fireEvent.change(screen.getByLabelText('Stock for S'), { target: { value: '20' } });
  fireEvent.change(screen.getByLabelText('Product images'), {
    target: { files: [new File(['dummy'], 'red.png', { type: 'image/png' })] }
  });

  // 6. Submit valid batch
  fireEvent.click(screen.getByRole('button', { name: /Create.*variant/i }));
  await waitFor(() => expect(postData).toHaveBeenCalledWith('productdetails_batch_submit', expect.any(FormData)));

  // Inspect the submitted FormData
  const callArgs = postData.mock.calls.find(c => c[0] === 'productdetails_batch_submit');
  const formData = callArgs[1];
  expect(formData.get('color')).toBe('Red');
  const submittedVariants = JSON.parse(formData.get('variants'));
  expect(submittedVariants).toEqual([
    { size: 'S', qty: '20', price: '499', offerprice: '0', sku: 'RED-S' },
    { size: 'L', qty: '10', price: '549', offerprice: '0', sku: 'RED-L' }
  ]);
});

