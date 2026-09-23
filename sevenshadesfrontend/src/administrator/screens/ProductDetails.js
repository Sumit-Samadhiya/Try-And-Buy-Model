import { FormControl,FormHelperText,InputLabel, Select,MenuItem, Grid,TextField,Button,Avatar } from "@mui/material";
import { useState,useEffect } from "react";
import { useStyles } from "./CategoryCss";
import TitleComponent from "../components/admin/TitleComponent";
import { postData } from "../../services/FetchDjangoApiServices";
import Swal from "sweetalert2";
import { getData } from "../../services/FetchDjangoApiServices";
import { json } from "react-router-dom";
import iconimage from '../../images/icon.png'


export default function ProductDetails(){
    var classes = useStyles();

    const [icon,setIcon]=useState({file:[],bytes:[]})
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
       
        setProductList(result.data)
      }
      useEffect(function(){
        fetchAllProduct()
      },[])
    const handleFetchProduct=(event)=>{
         setSubCategoryId(event.target.value)
         fetchAllProduct(event.target.value)
    }

     

    const handleChange=(event)=>{
        var files=Object.values(event.target.files)
        if(files.length>=4 && files.length<=7){
        setIcon({file:files,bytes:event.target.files})
       
        }
        else
         alert('pls Input 4 and Max 7 Images')
        handleError(false,"icon")
  }
    const showImages=()=>{
      return icon?.file?.map((item)=>{
       return <span><img src={URL.createObjectURL(item)} alt="" style={{width:40,height:40,borderRadius:10,marginRight:3}}/></span>
      })
    }
    const handleReset=()=>{
        setIcon({file:'icon1.png',bytes:''})
        setMainCategoryId('')
        setSubCategoryId('')
        setBrandId('')
        setProductId('')
        setProductSubName("")
        setDescription('')
        setQty('')
        setPrice('')
        setColor('')
        setSize('')
        setOfferPrice('')
        setOfferType('')



    }

    const handleError=(errormessage,label)=>{
        setFormError((prev)=>({...prev,[label]:errormessage })
    
      )}
      
      const handleClick=async()=>{
           var err=false
           if(mainCategoryId.length==0)
           {
             handleError("This field is required","maincategoryid")
             err=true
           }
           if(subCategoryId.length==0)
           {
             handleError("This field is required","subcategoryid")
             err=true
           }
           if(brandId.length==0)
           {
             handleError("This field is required","brandid")
             err=true
           }
           if(productId.length==0)
           {
             handleError("This field is required","productid")
             err=true
           }
           if(productSubName.length==0)
           {
             handleError("This field is required","productsubname")
             err=true
           }
           if(description.length==0)
           {
             handleError("This field is required","description")
             err=true
           }
           if(qty<=0)
           {
             handleError("This field is required","qty")
             err=true
           }
           if(price<=0)
           {
             handleError("This field is required","price")
             err=true
           }
           if(color.length==0)
           {
             handleError("This field is required","color")
             err=true
           }
           if(size<=0)
           {
             handleError("This field is required","size")
             err=true
           }
           if(offerPrice<=0)
           {
             handleError("This field is required","offerprice")
             err=true
           }
           if(offerType.length==0)
           {
             handleError("This field is required","offertype")
             err=true
           }
           if(icon.bytes.length==0)
           {
             handleError("pls select some icon","icon")
             err=true
           }
           if(err==false){
           var formData=new FormData()
           formData.append('maincategoryid',mainCategoryId)
           formData.append('subcategoryid',subCategoryId)
           formData.append('brandid',brandId)
           formData.append('productid',productId)
           formData.append('productsubname',productSubName)
           formData.append('description',description)
           formData.append('qty',qty)
           formData.append('price',price)
           formData.append('color',color)
           formData.append('size',size)
           formData.append('offerprice',offerPrice)
           formData.append('offertype',offerType)
           icon?.file?.map((item,i)=>{
            formData.append("icon",item)
           })
           var result=await postData('productdetails_submit',formData)
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
          }
      }





    return(
       <>
         <div className={classes.root}>
            <div className={classes.box}>
                <Grid container spacing={2}>
                <Grid item xs={12}>
                <TitleComponent title={'Product Details'} listicon={iconimage} link='/admindashboard/displayproductdetails'/>
            </Grid>
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
                        <TextField label="Description" error={formError.description} helperText={formError.description} onFocus={()=>handleError(false,'description')} value={description} fullWidth required onChange={(event)=>setDescription(event.target.value)} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField label="Quantity" error={formError.qty} helperText={formError.qty} onFocus={()=>handleError(false,'qty')} value={qty} fullWidth required onChange={(event)=>setQty(event.target.value)} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField label="Price" error={formError.price} helperText={formError.price} onFocus={()=>handleError(false,'price')} value={price} fullWidth required onChange={(event)=>setPrice(event.target.value)} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField label="Color" error={formError.color} helperText={formError.color} onFocus={()=>handleError(false,'color')} value={color} fullWidth required onChange={(event)=>setColor(event.target.value)} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField label="Size" error={formError.size} helperText={formError.size} onFocus={()=>handleError(false,'size')} value={size} fullWidth required onChange={(event)=>setSize(event.target.value)} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField label="Offer Price" error={formError.offerprice} helperText={formError.offerprice} onFocus={()=>handleError(false,'offerprice')} value={offerPrice} fullWidth required onChange={(event)=>setOfferPrice(event.target.value)} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField label="Offer Type" error={formError.offertype} helperText={formError.offertype} onFocus={()=>handleError(false,'offertype')} value={offerType} fullWidth required onChange={(event)=>setOfferType(event.target.value)} />
                    </Grid>
                    <Grid item xs={6} style={{display:'flex',justifyContent:'center',alignItems:'center',flexDirection:'column'}}>
                <Button fullWidth variant="contained" component='label'>
                    Upload Icon
                    <input  type="file" hidden accept="image/*" onChange={handleChange} multiple />
                </Button>
                {formError.icon?<><div style={{color:'#d32f2f',fontSize:'0.75rem',fontWeight:400,fontFamily:'"Roboto","Helvetica","Arial","sans-serif"',marginTop:4}}>{formError.icon}</div></>:<></>}
                </Grid>
                <Grid item xs={6} style={{display:'flex',justifyContent:'center',alignItems:'center'}}>
           {showImages()}
            </Grid>

            <Grid item xs={12} style={{display:'flex',gap:8}} >
                <Grid item xs={6}>
                    <Button fullWidth variant="contained" component='label' onClick={handleClick} >
                        SUBMIT
                    </Button>
                </Grid>
                <Grid item xs={6}>
                    <Button fullWidth variant="contained" component='label' onClick={handleReset}>
                        RESET
                    </Button>
                </Grid>
            </Grid>
    </Grid>
            </div>
         </div>
       </>

    );
}