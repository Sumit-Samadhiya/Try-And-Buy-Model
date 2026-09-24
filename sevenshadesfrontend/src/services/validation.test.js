import { validateFields } from './validation';
test('shared validation rejects invalid financial values and whitespace passwords',()=>{
  expect(validateFields('probe',{qty:-1,price:100,offerprice:101,password:'        '})).toEqual(expect.objectContaining({qty:expect.any(String),offerprice:expect.any(String),password:expect.any(String)}));
});
test('all uploaded files are checked, including files before the final FormData entry',()=>{
  const data=new FormData();data.append('icon',new File(['text'],'unsafe.html'));data.append('icon',new File(['image'],'last.png'));
  expect(validateFields('banner_submit',data).icon).toBeTruthy();
});
test('valid address passes but malformed PIN and mobile fail before submission',()=>{
  const address={address:'House 10, Main Road',city:'Delhi',country:'India',postcode:'110001',address_type:'Residential',mobileno:'9000000091'};
  expect(validateFields('address_submit',address)).toEqual({});
  expect(validateFields('address_submit',{...address,postcode:'abc',mobileno:'123'})).toEqual(expect.objectContaining({postcode:expect.any(String),mobileno:expect.any(String)}));
});
