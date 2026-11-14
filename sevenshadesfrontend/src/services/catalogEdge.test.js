const handler = require('../../api/catalog-read');
const response = () => { const res = {setHeader:jest.fn(),status:jest.fn(),json:jest.fn()}; res.status.mockReturnValue(res); return res; };
afterEach(() => jest.restoreAllMocks());
test('edge rejects private endpoints before contacting backend', async () => {
  global.fetch = jest.fn();
  const res = response();
  await handler({method:'GET',query:{resource:'auth_session'}},res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(fetch).not.toHaveBeenCalled();
});
test('edge caches successful public data without forwarding caller credentials', async () => {
  global.fetch = jest.fn().mockResolvedValue({ok:true,json:async()=>({status:true,data:[]})});
  const res = response();
  await handler({method:'GET',query:{resource:'user_maincategory_list'},headers:{cookie:'private',authorization:'secret'}},res);
  expect(fetch.mock.calls[0][1].headers).toEqual({Accept:'application/json'});
  expect(res.setHeader).toHaveBeenCalledWith('Vercel-CDN-Cache-Control',expect.stringContaining('s-maxage=60'));
});
test('edge allows product details by id and caches response', async () => {
  global.fetch = jest.fn().mockResolvedValue({ok:true,json:async()=>({status:true,data:[{id:42}]})});
  const res = response();
  await handler({method:'GET',query:{resource:'user_productsdetails_by_id?productid=42'}},res);
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('user_productsdetails_by_id?productid=42'), expect.anything());
  expect(res.setHeader).toHaveBeenCalledWith('Vercel-CDN-Cache-Control',expect.stringContaining('s-maxage=60'));
});
test('edge never caches upstream failure', async () => {
  global.fetch = jest.fn().mockRejectedValue(new Error('offline'));
  const res = response();
  await handler({method:'GET',query:{resource:'user_banner_list'}},res);
  expect(res.status).toHaveBeenCalledWith(503);
  expect(res.setHeader).not.toHaveBeenCalledWith('Vercel-CDN-Cache-Control',expect.anything());
});
