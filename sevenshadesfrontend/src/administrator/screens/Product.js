import { FormControl,FormHelperText,InputLabel, Select,MenuItem, Grid,TextField,Button,Avatar } from "@mui/material";
import { useState,useEffect } from "react";
import { useStyles } from "./CategoryCss";
import TitleComponent from "../components/admin/TitleComponent";
import { postData } from "../../services/FetchDjangoApiServices";
import Swal from "sweetalert2";
import { getData } from "../../services/FetchDjangoApiServices";
import iconimage from '../../images/icon.png'


export default function Product(){
    var classes = useStyles();

    const [icon,setIcon]=useState({file:'icon1.png',bytes:''})
    const [mainCategoryId,setMainCategoryId]=useState('')
    const [subCategoryId,setSubCategoryId]=useState('')
    const [brandId,setBrandId]=useState('')
    const [productName, setProductName] = useState("")
    const [description,setDescription]=useState('')
    const [formError,setFormError]=useState({icon:false})
    const [mainCategoryList,setMainCategoryList]=useState([])
    const [subCategoryList,setSubCategoryList]=useState([])
    const [brandList,setBrandList]=useState([])


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
      useEffect(function(){
        fetchAllSubCategory()
      },[])

      const fetchAllBrand=async()=>{
        var result=await getData('brand_list')
        setBrandList(result.data)
      }
      const fillBrand=()=>{
        return brandList.map((item)=>{
          return <MenuItem value={item.id}>{item.brandname}</MenuItem>
        })
      }
      useEffect(function(){
        fetchAllBrand()
      },[])
      const fetchAllSubCategory=async(mid)=>{
        var result=await postData('product_mysubcategory_list_by_maincategoryid',{maincategoryid:mid})
        setSubCategoryList(result.data)
      }
    const handleFetchSubCategory=(event)=>{
         setMainCategoryId(event.target.value)
         fetchAllSubCategory(event.target.value)
    }


    const handleChange=(event)=>{
        setIcon({file:URL.createObjectURL(event.target.files[0]),bytes:event.target.files[0]})
        handleError(false,"icon")
  }
    const handleReset=()=>{
        setIcon({file:'icon1.png',bytes:''})
        setMainCategoryId('')
        setSubCategoryId('')
        setBrandId('')
        setProductName("")
        setDescription('')


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
           if(productName.length==0)
           {
             handleError("This field is required","productname")
             err=true
           }
           if(description.length==0)
           {
             handleError("This field is required","description")
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
           formData.append('productname',productName)
           formData.append('description',description)
           formData.append('icon',icon.bytes)
           var result=await postData('product_submit',formData)
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
                <TitleComponent title={'Products'} listicon={iconimage} link='/admindashboard/displayallproduct'/>
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


                      <FormControl fullWidth>
                        <InputLabel>Sub Category Id</InputLabel>
                        <Select onFocus={()=>handleError('','subcategoryid')} error={formError.subcategoryid} value={subCategoryId} label={"SubCategory Id"} onChange={(event)=>setSubCategoryId(event.target.value)}>
                          <MenuItem value="Select Category">Select Category</MenuItem>
                          {fillSubCategory()}
                        </Select>
                        <FormHelperText>{formError.subcategoryid}</FormHelperText>
                      </FormControl>


                      <FormControl fullWidth>
                        <InputLabel>Brand Id</InputLabel>
                        <Select onFocus={()=>handleError('','brandid')} error={formError.brandid} value={brandId} label={"Brand Id"} onChange={(event)=>setBrandId(event.target.value)}>
                          <MenuItem value="Select Category">Select Category</MenuItem>
                          {fillBrand()}
                        </Select>
                        <FormHelperText>{formError.maincategoryid}</FormHelperText>
                      </FormControl>








                        
                    </Grid>
                    <Grid item xs={12}>
                        <TextField label="Product Name" error={formError.productname} helperText={formError.productname} onFocus={()=>handleError(false,'product')} value={productName} fullWidth required onChange={(event)=>setProductName(event.target.value)} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField label="Description" error={formError.des} helperText={formError.des} onFocus={()=>handleError(false,'des')} value={description} fullWidth required onChange={(event)=>setDescription(event.target.value)} />
                    </Grid>
                    <Grid item xs={6} style={{display:'flex',justifyContent:'center',alignItems:'center',flexDirection:'column'}}>
                <Button fullWidth variant="contained" component='label'>
                    Upload Icon
                    <input  type="file" hidden accept="images/*" onChange={handleChange} />
                </Button>
                {formError.icon?<><div style={{color:'#d32f2f',fontSize:'0.75rem',fontWeight:400,fontFamily:'"Roboto","Helvetica","Arial","sans-serif"',marginTop:4}}>{formError.icon}</div></>:<></>}
                </Grid>
                <Grid item xs={6} style={{display:'flex',justifyContent:'center',alignItems:'center'}}>
            <Avatar
            alt="Icon"
            variant="rounded"
            src={icon.file}
            sx={{ width: 78,height:78 }}/>
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