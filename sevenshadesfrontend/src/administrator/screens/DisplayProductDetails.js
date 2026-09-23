import MaterialTable from "@material-table/core";
import { useStyles } from "./CategoryCss";
import { useEffect,useState } from "react";
import TitleComponent from "../components/admin/TitleComponent";
import Swal from "sweetalert2";
import {FormControl,FormHelperText,InputLabel, Select,MenuItem, Button,TextField,Avatar } from "@mui/material";
import { getData, serverURL,postData } from "../../services/FetchDjangoApiServices";
import Dialog from  '@mui/material/Dialog';
import  DialogActions  from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import {Grid} from "@mui/material";
import DialogTitle from "@mui/material/DialogTitle";


export default function DisplayProductDetails(){
    var classes = useStyles()
    const [open,setOpen]=useState(false)
    const [productDetailsList,setProductDetailsList]=useState([])

    const [icon,setIcon]=useState({file:'icon1.png',bytes:''})
    const [id,setId]=useState('')
    const [mainCategoryId,setMainCategoryId]=useState('')
    const [subCategoryId,setSubCategoryId]=useState('')
    const [brandId,setBrandId]=useState('')
    const [productId,setProductId]=useState('')
    const [productSubName, setProductSubName] = useState("")
    const [description,setDescription]=useState('')
    const [qty,setQty]=useState('')
    const [price,setPrice]=useState('')
    const [color,setColor]=useState('')
    const [size,setSize]=useState('')
    const [offerPrice,setOfferPrice]=useState('')
    const [offerType,setOfferType]=useState('')
    const [tempIcon,setTempIcon]=useState('')
    
    const [btnStatus,setBtnStatus]=useState(true)

    const [formError,setFormError]=useState({icon:false})
    const [mainCategoryList,setMainCategoryList]=useState([])
    const [subCategoryList,setSubCategoryList]=useState([])
    const [brandList,setBrandList]=useState([])
    const [productList,setProductList]=useState([])



    const fetchAllMainCategory=async()=>{
      var result=await getData('maincategory_list')
      setMainCategoryList(result.data)
    }
    const fillMainCategory=()=>{
      return mainCategoryList.map((item)=>{
        return <MenuItem  value={item.id}>{item.maincategoryname}</MenuItem>
      })
    }
    useEffect(function(){
      fetchAllMainCategory()
    },[])

    
      const fillSubCategory=()=>{
        return subCategoryList.map((item)=>{
          return <MenuItem value={item.id}>{item.subcategoryname}</MenuItem>
        })
      }
      const fetchAllSubCategory=async(mid)=>{
        var result=await postData('product_mysubcategory_list_by_maincategoryid',{maincategoryid:mid})
        setSubCategoryList(result.data)
      }
    const handleFetchSubCategory=(event)=>{
         setMainCategoryId(event.target.value)
         fetchAllSubCategory(event.target.value)
    }

      useEffect(function(){
        fetchAllSubCategory()
      },[])

      const handleFetchBrand=(event)=>{
        setProductId(event.target.value)
        fetchAllBrand(event.target.value)
      }

      const fetchAllBrand=async(pid)=>{
        var result=await postData('productdetail_brand_list_by_productid',{productid:pid})
        setBrandList(result.data)
      }
      const fillBrand=()=>{
        return brandList.map((item)=>{
          return <MenuItem value={item.brandid.id}>{item.brandid.brandname}</MenuItem>
        })
      }
      useEffect(function(){
        fetchAllBrand()
      },[])


      const fillProduct=()=>{
        return productList.map((item)=>{
          return <MenuItem value={item.id}>{item.productname}</MenuItem>
        })
      }
      const fetchAllProduct=async(sid)=>{
        var result=await postData('productdetail_product_list_by_subcategoryid',{subcategoryid:sid})
        console.log("dfgaeaer",result.data)
        setProductList(result.data)
      }
      useEffect(function(){
        fetchAllProduct()
      },[])
    const handleFetchProduct=(event)=>{
         setSubCategoryId(event.target.value)
         fetchAllProduct(event.target.value)
    }


      const handleOpenDialog=(rowData)=>{
        setId(rowData.id)
        setMainCategoryId(rowData.maincategoryid.id)
        setSubCategoryId(rowData.subcategoryid.id)
        setBrandId(rowData.brandid.id)
        setProductId(rowData.productid.id)
        setProductSubName(rowData.productsubname)
        setDescription(rowData.description)
        setQty(rowData.qty)
        setPrice(rowData.price)
        setColor(rowData.color)
        setSize(rowData.size)
        setOfferPrice(rowData.offerprice)
        setOfferType(rowData.offertype)
        setIcon({file:`${serverURL}${rowData.icon}`,bytes:''})
        setTempIcon(`${serverURL}${rowData.icon}`)
        setOpen(true)
    }
    const handleClose=()=>{
        setOpen(false)
      }
      const handleError=(errormessage,label)=>{
        setFormError((prev)=>({...prev,[label]:errormessage })
    
      )}
      const handleChange=(event)=>{
         
        setIcon({file:URL.createObjectURL(event.target.files[0]),bytes:event.target.files[0]})
        handleError(false,"icon")
        setBtnStatus(false)
        
  }

  const handleDeleteData=(rowData)=>{
    Swal.fire({
      title:"Do you want to delete data?",
      showDenyButton:true,
      
      confirmButtonText:'Delete',
      denyButtonText:'Do not delete'

    }).then(async(result)=>{
      if(result.isConfirmed){
        var body={id:rowData.id}
    var result=await postData('deleteproductdetails',body)
    if(result.status)
    {
      Swal.fire("Deleted..", "","success" ) 
      
    }
    fetchProductDetails()
        
      }
      else if (result.isDenied){
        Swal.fire("Not Deleted")
      }

    });
    
  }

  const handleCancel=()=>{
    setBtnStatus(true)
    setIcon({file:tempIcon,bytes:''})
  
  }

  const handleEditIcon=async()=>{
    var formData=new FormData()
       formData.append('id',id)
       formData.append('icon',icon.bytes)
       var result=await postData('editproductdetails_icon',formData)
       if(result.status)
       {
        Swal.fire({
          title:"The Seven Shades",
          text:result.message,
          icon:"success",
          toast:true,
        })
       }
       else{
        Swal.fire({
          title:"The Seven Shades",
          text:result.message,
          icon:"error",
          toast:true,
        })
       }
       fetchProductDetails()
       setBtnStatus(true)
  }
  const handleEditData=async()=>{
      var body={id:id,maincategoryid:mainCategoryId,subcategoryid:subCategoryId,brandid:brandId,productid:productId,productsubname:productSubName,description:description,qty:qty,price:price,size:size,color:color,offerprice:offerPrice,offertype:offerType}
      var result=await postData('editproductdetails_data',body)
      if(result.status)
      {
       Swal.fire({
         title:"The Seven Shades",
         text:result.message,
         icon:"success",
         toast:true,
       })
      }
      else{
       Swal.fire({
         title:"The Seven Shades",
         text:result.message,
         icon:"error",
         toast:true,
       })
      }
      fetchProductDetails()
  }
  useEffect(function(){
    fetchProductDetails() 
  },[])

  const fetchProductDetails = async () => {
    try {
        
        var result = await getData('productdetails_list');
        console.log("ddfsgd",result.data)
        if (result && result.data) {
            
            setProductDetailsList(result.data);
        } else {
            // Handle case where result or result.data is null/undefined
            console.error('Error: Received null or undefined response from server');
        }
    }   catch (error) {
        // Handle any errors that occurred during the request
        console.error('Error fetching main category data:', error);
    }
};
  

  const showProductDetailsDialog=()=>{
    return(<Dialog open={open} fullWidth={true} maxWidth={"sm"}>
      <DialogTitle>
        <TitleComponent title={'Update Product'} listicon=''/>
      </DialogTitle>
      <DialogContent>
      <div style={{margin:5}}>
      <Grid container spacing={2}>
      <Grid  item xs={12}>
                      <FormControl fullWidth>
                        <InputLabel>MainCategory Id</InputLabel>
                        <Select onChange={handleFetchSubCategory}  onFocus={()=>handleError('','maincategoryid')} error={formError.maincategoryid} value={mainCategoryId} label={"MainCategory Id"} >
                          <MenuItem value="Select Category">Select Category</MenuItem>
                          {fillMainCategory()}
                        </Select>
                        <FormHelperText>{formError.maincategoryid}</FormHelperText>
                      </FormControl>
                      </Grid>

                      <Grid  item xs={12}>
                      <FormControl fullWidth>
                        <InputLabel>Sub Category Id</InputLabel>
                        <Select onChange={handleFetchProduct} onFocus={()=>handleError('','subcategoryid')} error={formError.subcategoryid} value={subCategoryId} label={"SubCategory Id"}>
                          <MenuItem value="Select Category">Select Category</MenuItem>
                          {fillSubCategory()}
                        </Select>
                        <FormHelperText>{formError.subcategoryid}</FormHelperText>
                      </FormControl>
                      </Grid>

 
                      <Grid  item xs={12}>
                      <FormControl fullWidth>
                        <InputLabel>Product Id</InputLabel>
                        <Select onChange={handleFetchBrand} onFocus={()=>handleError('','productid')} error={formError.productid} value={productId} label={"Product Id"}>
                          <MenuItem value="Select Product">Select Product</MenuItem>
                          {fillProduct()}
                        </Select>
                        <FormHelperText>{formError.productid}</FormHelperText>
                      </FormControl>
                      </Grid>



                      <Grid  item xs={12}>
                      <FormControl fullWidth>
                        <InputLabel>Brand Id</InputLabel>
                        <Select onChange={(event)=>setBrandId(event.target.value)}  onFocus={()=>handleError('','brandid')} error={formError.brandid} value={brandId} label={"Brand Id"} >
                          <MenuItem value="Select Category">Select Category</MenuItem>
                          {fillBrand()}
                        </Select>
                        <FormHelperText>{formError.brandid}</FormHelperText>
                      </FormControl>
                      </Grid>







                   
                    <Grid item xs={12}>
                        <TextField label="Product Sub Name" error={formError.productsubname} helperText={formError.productsubname} onFocus={()=>handleError(false,'productdetails')} value={productSubName} fullWidth required onChange={(event)=>setProductSubName(event.target.value)} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField label="Description" error={formError.des} helperText={formError.des} onFocus={()=>handleError(false,'des')} value={description} fullWidth required onChange={(event)=>setDescription(event.target.value)} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField label="Quantity" error={formError.qt} helperText={formError.qt} onFocus={()=>handleError(false,'qt')} value={qty} fullWidth required onChange={(event)=>setQty(event.target.value)} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField label="Price" error={formError.pr} helperText={formError.pr} onFocus={()=>handleError(false,'pr')} value={price} fullWidth required onChange={(event)=>setPrice(event.target.value)} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField label="Color" error={formError.col} helperText={formError.col} onFocus={()=>handleError(false,'col')} value={color} fullWidth required onChange={(event)=>setColor(event.target.value)} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField label="Size" error={formError.siz} helperText={formError.siz} onFocus={()=>handleError(false,'siz')} value={size} fullWidth required onChange={(event)=>setSize(event.target.value)} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField label="Offer Price" error={formError.offerprice} helperText={formError.offerprice} onFocus={()=>handleError(false,'offerprice')} value={offerPrice} fullWidth required onChange={(event)=>setOfferPrice(event.target.value)} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField label="Offer Type" error={formError.offertype} helperText={formError.offertype} onFocus={()=>handleError(false,'offertype')} value={offerType} fullWidth required onChange={(event)=>setOfferType(event.target.value)} />
                    </Grid>
        <Grid item xs={6} style={{display:'flex',justifyContent:'center',alignItems:'center',flexDirection:'column'}}>
         {btnStatus?
         <div>
            <Button fullWidth variant="contained" component='label'>
                Upload Icon
                <input  type="file" hidden accept="images/*"  onChange={handleChange}/>
            </Button>
           
            {formError.icon?<><div style={{color:'#d32f2f',fontSize:'0.75rem',fontWeight:400,fontFamily:'"Roboto","Helvetica","Arial","sans-serif"',marginTop:4}}>{formError.icon}</div></>:<></>}
            </div>:<div><Button onClick={handleEditIcon}>Save</Button><Button onClick={handleCancel}>Cancel</Button></div>}
           
        </Grid>

        <Grid item xs={6} style={{display:'flex',justifyContent:'center',alignItems:'center'}}>
        <Avatar
        alt="Icon"
        variant="rounded"
        src={icon.file}
        sx={{ width: 78,height:78 }}/>
        </Grid>

       
    </Grid>
    </div>
    
      </DialogContent>
      <DialogActions>
      <Button onClick={handleEditData} >Edit Data</Button>
        <Button onClick={handleClose} >Close</Button>
      </DialogActions>
    </Dialog>)
  } 


  function listAllProductDetails() {
        
    return (
      <MaterialTable
        title={<TitleComponent title={'List Product Details'} listicon='' />}
        columns={[
          { title: 'id', field: 'id' },
          { title: 'Main Category id', render:(rowData)=><div><div>{rowData.maincategoryid.id}</div><div>{rowData.maincategoryid.maincategoryname}</div></div> },
          { title: 'Sub Category id', render:(rowData)=><div><div>{rowData.subcategoryid.id}</div><div>{rowData.subcategoryid.subcategoryname}</div></div> },

          { title: 'Brand id', render:(rowData)=><div><div>{rowData.brandid.id}</div><div>{rowData.brandid.brandname}</div></div> },
          { title: 'Product id', render:(rowData)=><div><div>{rowData.productid.id}</div><div>{rowData.productid.productname}</div></div> },
          { title: 'Product Sub name', field: 'productsubname' },
          { title: 'Description', field: 'description' },
          { title: 'quantity', field: 'qty' },
          { title: 'Price', field: 'price' },
          { title: 'Color', field: 'color' },
          { title: 'Size', field: 'size' },
          { title: 'Offer Price', field: 'offerprice' },
          { title: 'Offer Type', field: 'offertype' },
          { title: 'icon',render:(row)=><>{row?.icon?.split(',').map((item)=><img src={`${serverURL}/static/${item}`} alt="icons" style={{width:30,height:30,borderRadius:50,margin:1}}  />)}</> },
         
        ]}
        data={productDetailsList}        
       
        actions={[
          {
            icon:'edit',
            tooltip:'Edit Category',
            onClick:(event,rowData)=>handleOpenDialog(rowData)
          },
          {
            icon:'delete',
            tooltip:'remove Category',
            onClick:(event,rowData)=> handleDeleteData(rowData)
          }
        ]}
      />
    )
}


  return(
    <div className={classes.display_root}>
    <div className={classes.display_box}>
    {listAllProductDetails()}
    </div>
    {showProductDetailsDialog()}
</div>
);

}
