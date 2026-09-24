import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogContent, DialogTitle, Grid, LinearProgress, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { getData, postData } from '../../services/FetchDjangoApiServices';
import { validateFields } from '../../services/validation';
import imageUrl from '../../services/imageUrl';
const idOf = value => String(value?.id ?? value ?? '');
const blank = {maincategoryid:'',subcategoryid:'',brandid:'',productid:'',productname:'',productsubname:'',description:'',qty:'0',price:'',offerprice:'0',color:'',size:'',offertype:'None'};
const endpoints = variant => variant ? {list:'productdetails_list',create:'productdetails_submit',edit:'editproductdetails_data',image:'editproductdetails_icon',remove:'deleteproductdetails',route:'productdetails',listRoute:'displayproductdetails'} : {list:'product_list',create:'product_submit',edit:'editproduct_data',image:'editproduct_icon',remove:'deleteproductdata',route:'product',listRoute:'displayallproduct'};
function ProductForm({variant, row, catalog, onSaved, onCancel}) {
 const api=endpoints(variant);
 const initial=()=>row ? {...blank,...row,...Object.fromEntries(['maincategoryid','subcategoryid','brandid','productid'].map(key=>[key,idOf(row[key])]))} : {...blank};
 const [values,setValues]=useState(initial),[files,setFiles]=useState([]),[errors,setErrors]=useState({}),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[fileKey,setFileKey]=useState(0);
 const previews=useMemo(()=>files.map(file=>URL.createObjectURL(file)),[files]);
 useEffect(()=>()=>previews.forEach(url=>URL.revokeObjectURL(url)),[previews]);
 const subs=catalog.subcategories.filter(item=>idOf(item.maincategoryid)===values.maincategoryid);
 const products=catalog.products.filter(item=>idOf(item.maincategoryid)===values.maincategoryid && idOf(item.subcategoryid)===values.subcategoryid);
 const update=(key,value)=>{setErrors(previous=>({...previous,[key]:''}));setValues(previous=>{
   const next={...previous,[key]:value};
   if(key==='maincategoryid'){next.subcategoryid='';if(variant){next.productid='';next.brandid='';}}
   if(key==='subcategoryid' && variant){next.productid='';next.brandid='';}
   if(key==='productid')next.brandid=idOf(catalog.products.find(item=>idOf(item.id)===value)?.brandid);
   return next;
 });};
 const select=(key,label,items,name,disabled=false)=><Grid item xs={12} sm={6}><TextField select fullWidth label={label} value={values[key]} disabled={busy||disabled} error={!!errors[key]} helperText={errors[key]} onChange={event=>update(key,event.target.value)}><MenuItem value="">Choose {label.toLowerCase()}</MenuItem>{items.map(item=><MenuItem key={item.id} value={String(item.id)}>{item[name]}</MenuItem>)}</TextField></Grid>;
 const field=(key,label,max=70,numeric=false)=><Grid item xs={12} sm={key==='description'?12:6}><TextField fullWidth label={label} value={values[key]} disabled={busy} error={!!errors[key]} helperText={errors[key] || (key==='offerprice'?'0 means no offer':key==='qty'?'Available stock, excluding items already reserved for orders':'')} type={numeric?'number':'text'} inputProps={numeric?{min:key==='price'?1:0,step:1}:{maxLength:max}} multiline={key==='description'} onChange={event=>update(key,event.target.value)}/></Grid>;
 const submit=async(event)=>{
   event.preventDefault();if(busy)return;
   const keys=['maincategoryid','subcategoryid','brandid','description',...(variant?['productid','productsubname','qty','price','offerprice','size','color','offertype']:['productname'])];
   const payload=Object.fromEntries(keys.map(key=>[key,typeof values[key]==='string'?values[key].trim():values[key]]));
   if(row){payload.id=row.id;if(variant)payload.expected_qty=row.qty;}
   let body=payload;
   if(!row){body=new FormData();Object.entries(payload).forEach(([key,value])=>body.append(key,value));files.forEach(file=>body.append('icon',file));}
   const endpoint=row?api.edit:api.create;
   const validation=validateFields(endpoint,body);setErrors(validation);setMessage('');
   if(Object.keys(validation).length)return;
   setBusy(true);const result=await postData(endpoint,body);setBusy(false);
   if(result.status){onSaved(result.message);if(!row){setValues({...blank});setFiles([]);setFileKey(key=>key+1);}}
   else {setMessage(result.message||'Could not save. Please retry.');setErrors(Object.fromEntries(Object.entries(result.errors||{}).map(([key,value])=>[key,Array.isArray(value)?value[0]:value])));}
 };
 const saveImages=async()=>{
   if(busy)return;const body=new FormData();body.append('id',row.id);files.forEach(file=>body.append('icon',file));
   const validation=validateFields(api.image,body);setErrors(validation);if(Object.keys(validation).length)return;
   setBusy(true);const result=await postData(api.image,body);setBusy(false);
   if(result.status)onSaved(result.message);else setMessage(result.message||'Could not update images.');
 };
 return <Box component="form" onSubmit={submit}><Stack spacing={2}>{message&&<Alert severity="error">{message}</Alert>}<Grid container spacing={2}>
 {select('maincategoryid','Category',catalog.categories,'maincategoryname')}{select('subcategoryid','Subcategory',subs,'subcategoryname',!values.maincategoryid)}
 {variant&&select('productid','Product',products,'productname',!values.subcategoryid)}
 {select('brandid','Brand',catalog.brands,'brandname',variant)}
 {field(variant?'productsubname':'productname',variant?'Variant name':'Product name')}{field('description','Description',150)}
 {variant&&<>{field('qty','Quantity',70,true)}{field('price','Regular price',70,true)}{field('offerprice','Offer price',70,true)}{field('size','Size')}{field('color','Colour')}{field('offertype','Offer type')}</>}
 </Grid><Typography variant="body2">{row?'Replace images (optional)':'Product images'} · {variant?'1–10 images':'1 image'}, up to 5 MB each</Typography>
 <input key={fileKey} aria-label="Product images" type="file" accept=".jpg,.jpeg,.png,.webp,.avif,.gif" multiple={variant} disabled={busy} onChange={event=>{setFiles(Array.from(event.target.files||[]));setErrors(previous=>({...previous,icon:''}));}}/>
 {errors.icon&&<Alert severity="error">{errors.icon}</Alert>}
 <Stack direction="row" gap={1} flexWrap="wrap">{(files.length?previews:(row?.icon||'').split(',').filter(Boolean).map(imageUrl)).map((url,index)=><Box component="img" key={url+index} src={url} alt={'Product image '+(index+1)} sx={{width:80,height:90,objectFit:'cover',borderRadius:1}}/>)}</Stack>
 <Stack direction="row" gap={1} flexWrap="wrap"><Button type="submit" variant="contained" disabled={busy}>{busy?'Saving…':row?'Save details':'Create '+(variant?'variant':'product')}</Button>{row&&<Button disabled={busy||!files.length} onClick={saveImages}>Replace images</Button>}<Button disabled={busy} onClick={()=>{setValues(initial());setFiles([]);setErrors({});setMessage('');setFileKey(key=>key+1);}}>Reset</Button>{onCancel&&<Button disabled={busy} onClick={onCancel}>Close</Button>}</Stack></Stack></Box>;
}
export default function CatalogWorkspace({variant=false,list=false}){
 const api=endpoints(variant);const [catalog,setCatalog]=useState(null),[rows,setRows]=useState([]),[error,setError]=useState(''),[success,setSuccess]=useState(''),[busy,setBusy]=useState(true),[selected,setSelected]=useState(null),[deleting,setDeleting]=useState(null),[removing,setRemoving]=useState(false);
 const [filters,setFilters]=useState({q:'',category:'',brand:'',stock:''}),[page,setPage]=useState(0),[size,setSize]=useState(10);
 const load=async()=>{setBusy(true);setError('');const results=await Promise.all(['maincategory_list','mysubcategory_list','brand_list','product_list',...(variant?['productdetails_list']:[])].map(getData));setBusy(false);
  const failed=results.find(result=>!result.status||!Array.isArray(result.data));if(failed){setError(failed.message||'Unable to load catalog. Please retry.');return;}
  setCatalog({categories:results[0].data,subcategories:results[1].data,brands:results[2].data,products:results[3].data});setRows(results[variant?4:3].data);
 };
 useEffect(()=>{load();},[variant]); // eslint-disable-line react-hooks/exhaustive-deps
 const change=(key,value)=>{setFilters({...filters,[key]:value});setPage(0);};
 const filtered=rows.filter(row=>(!filters.category||idOf(row.maincategoryid)===filters.category)&&(!filters.brand||idOf(row.brandid)===filters.brand)&&(!filters.stock||(filters.stock==='out'?row.qty===0:row.qty>0&&row.qty<=3))&&[row.id,row.productname,row.productsubname,row.productid?.productname,row.maincategoryid?.maincategoryname,row.subcategoryid?.subcategoryname,row.brandid?.brandname,row.size,row.color].join(' ').toLowerCase().includes(filters.q.trim().toLowerCase()));
 const safePage=Math.min(page,Math.max(0,Math.ceil(filtered.length/size)-1));
 const saved=message=>{setSuccess(message||'Saved successfully.');setSelected(null);load();};
 const remove=async()=>{if(removing)return;setRemoving(true);const result=await postData(api.remove,{id:deleting.id});setRemoving(false);setDeleting(null);if(result.status)saved(result.message);else setError(result.message||'Could not delete this item.');};
 return <Stack spacing={3}><Stack direction="row" gap={2} justifyContent="space-between"><Typography variant="h4" fontWeight={800}>{list?(variant?'Product variants':'Products'):(variant?'Add product variant':'Add product')}</Typography>{list&&<Button disabled={busy} onClick={load}>Refresh</Button>}<Button component={Link} to={'/admindashboard/'+(list?api.route:api.listRoute)}>{list?'Add new':'View all'}</Button></Stack>{busy&&<LinearProgress/>}{error&&<Alert severity="error" action={<Button onClick={load}>Retry</Button>}>{error}</Alert>}{success&&<Alert onClose={()=>setSuccess('')}>{success}</Alert>}
 {catalog&&!list&&<Paper variant="outlined" sx={{p:{xs:2,md:3},borderRadius:3}}><ProductForm variant={variant} catalog={catalog} onSaved={saved}/></Paper>}
 {catalog&&list&&<><Paper variant="outlined" sx={{p:2}}><Stack direction={{xs:'column',md:'row'}} gap={2}><TextField label="Search products" size="small" value={filters.q} onChange={e=>change('q',e.target.value)}/><TextField select size="small" label="Category" sx={{minWidth:150}} value={filters.category} onChange={e=>change('category',e.target.value)}><MenuItem value="">All</MenuItem>{catalog.categories.map(item=><MenuItem key={item.id} value={String(item.id)}>{item.maincategoryname}</MenuItem>)}</TextField><TextField select size="small" label="Brand" sx={{minWidth:150}} value={filters.brand} onChange={e=>change('brand',e.target.value)}><MenuItem value="">All</MenuItem>{catalog.brands.map(item=><MenuItem key={item.id} value={String(item.id)}>{item.brandname}</MenuItem>)}</TextField>{variant&&<TextField select size="small" label="Stock" sx={{minWidth:150}} value={filters.stock} onChange={e=>change('stock',e.target.value)}><MenuItem value="">All</MenuItem><MenuItem value="low">Low (1–3)</MenuItem><MenuItem value="out">Out of stock</MenuItem></TextField>}<Button onClick={()=>{setFilters({q:'',category:'',brand:'',stock:''});setPage(0);}}>Reset filters</Button></Stack></Paper>
 <Paper variant="outlined"><TableContainer><Table><TableHead><TableRow>{['Product','Category / brand',...(variant?['Size / colour','Available','Price / offer']:[]),'Actions'].map(text=><TableCell key={text}>{text}</TableCell>)}</TableRow></TableHead><TableBody>{filtered.slice(safePage*size,(safePage+1)*size).map(row=><TableRow key={row.id}><TableCell><Stack direction="row" gap={2}><Box component="img" src={imageUrl(row.icon)} alt="" sx={{width:48,height:60,objectFit:'cover'}}/><Box><Typography fontWeight={700}>{row.productsubname||row.productname}</Typography><Typography variant="caption">#{row.id} {row.productid?.productname}</Typography></Box></Stack></TableCell><TableCell>{row.maincategoryid?.maincategoryname} / {row.subcategoryid?.subcategoryname}<Typography variant="caption" display="block">{row.brandid?.brandname}</Typography></TableCell>{variant&&<><TableCell>{row.size} / {row.color}</TableCell><TableCell>{row.qty}</TableCell><TableCell>₹{row.price} / {row.offerprice? '₹'+row.offerprice:'No offer'}</TableCell></>}<TableCell><Button onClick={()=>{setSelected(row);setSuccess('');}}>Edit</Button><Button color="error" onClick={()=>setDeleting(row)}>Delete</Button></TableCell></TableRow>)}{!filtered.length&&<TableRow><TableCell colSpan={variant?6:3}>No products match these filters.</TableCell></TableRow>}</TableBody></Table></TableContainer><TablePagination component="div" count={filtered.length} page={safePage} rowsPerPage={size} rowsPerPageOptions={[10,20,50]} onPageChange={(_,value)=>setPage(value)} onRowsPerPageChange={e=>{setSize(Number(e.target.value));setPage(0);}}/></Paper></>}
 <Dialog open={!!selected} maxWidth="md" fullWidth><DialogTitle>Edit {variant?'variant':'product'}</DialogTitle><DialogContent>{selected&&<Box sx={{pt:1}}><ProductForm key={selected.id} variant={variant} row={selected} catalog={catalog} onSaved={saved} onCancel={()=>setSelected(null)}/></Box>}</DialogContent></Dialog>
 <Dialog open={!!deleting} onClose={()=>!removing&&setDeleting(null)}><DialogTitle>Delete this {variant?'variant':'product'}?</DialogTitle><DialogContent><Typography mb={2}>This cannot be undone. Products with variants and variants used in orders cannot be deleted.</Typography><Button color="error" disabled={removing} onClick={remove}>Confirm delete</Button><Button disabled={removing} onClick={()=>setDeleting(null)}>Cancel</Button></DialogContent></Dialog>
 </Stack>;
}
