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


export default function DisplayAllProduct(){
    var classes=useStyles()
    const [open,setOpen]=useState(false)
    const [productList,setProductList]=useState([])
    

    const [id,setId]=useState('')
    const [mainCategoryId,setMainCategoryId]=useState('')
    const [subCategoryId,setSubCategoryId]=useState('')
    const [brandId,setBrandId]=useState('')
    const [productName,setProductName]=useState('')
    const [description,setDescription]=useState('')
    const [icon,setIcon]=useState({file:'icon1.png',bytes:''})
    const [formError,setFormError]=useState({icon:false})
    const [btnStatus,setBtnStatus]=useState(true)
    const [tempIcon,setTempIcon]=useState('')
  
    const [mainCategoryList,setMainCategoryList]=useState([])
    const [subCategoryList,setSubCategoryList]=useState([])
    const [brandList,setBrandList]=useState([])


    const fetchAllMainCategory=async()=>{
      var result=await getData('maincategory_list')
      setMainCategoryList(result.data)
    }
    const fillMainCategory=()=>{
      return mainCategoryList.map((item)=>{
        return <MenuItem value={item.id}>{item.maincategoryname}</MenuItem>
      })
    }
    useEffect(function(){
      fetchAllMainCategory()
    },[])

    const fetchAllSubCategory=async(mid)=>{
      var result=await postData('product_mysubcategory_list_by_maincategoryid',{maincategoryid:mid})
      setSubCategoryList(result.data)
    }
    const handleFetchSubCategory=(event)=>{
      setMainCategoryId(event.target.value)
      fetchAllSubCategory(event.target.value)
 }
      const fillSubCategory=()=>{
        return subCategoryList.map((item)=>{
          return <MenuItem value={item.id}>{item.subcategoryname}</MenuItem>
        })
      }
      // useEffect(function(){
      //   fetchAllSubCategory()
      // },[])

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








    const handleOpenDialog=(rowData)=>{
        setId(rowData.id)
        setMainCategoryId(rowData.maincategoryid.id)
        setSubCategoryId(rowData.subcategoryid.id)
        setBrandId(rowData.brandid.id)
        setProductName(rowData.productname)
        setDescription(rowData.description)
        setIcon({file:`${serverURL}${rowData.icon}`,bytes:''})
        setTempIcon(`${serverURL}${rowData.icon}`)
        setOpen(true)
    }
    const handleClose=()=>{
        setOpen(false)
      }
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
            var result=await postData('deleteproductdata',body)
            if(result.status)
            {
              Swal.fire("Deleted..", "","success" ) 
              
            }
            fetchProduct()
                
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
               var result=await postData('editproduct_icon',formData)
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
               fetchProduct()
               setBtnStatus(true)
          }

          const handleError=(errormessage,label)=>{
            setFormError((prev)=>({...prev,[label]:errormessage })
        
          )}
    useEffect(function(){
        fetchProduct() 
      },[])
      const fetchProduct = async () => {
        try {
            var result = await getData('product_list');
            if (result && result.data) {
                setProductList(result.data);
            } else {
                // Handle case where result or result.data is null/undefined
                console.error('Error: Received null or undefined response from server');
            }
        } catch (error) {
            // Handle any errors that occurred during the request
            console.error('Error fetching main category data:', error);
        }
    };
    function listAllProduct() {
        
        return (
          <MaterialTable
            title={<TitleComponent title={'List Product'} listicon='' />}
            columns={[
              { title: 'id', field: 'id' },
              { title: 'Main Category id', render:(rowData)=><div><div>{rowData.maincategoryid.id}</div><div>{rowData.maincategoryid.maincategoryname}</div></div> },
              { title: 'Sub Category id', render:(rowData)=><div><div>{rowData.subcategoryid.id}</div><div>{rowData.subcategoryid.subcategoryname}</div></div> },
              { title: 'Brand id', render:(rowData)=><div><div>{rowData.brandid.id}</div><div>{rowData.brandid.brandname}</div></div> },
              { title: 'Product name', field: 'productname' },
              { title: 'Description', field: 'description' },
              { title: 'icon',render:(row)=><><img src={`${serverURL}${row.icon}`} alt="icons" style={{width:40,height:40,borderRadius:10}}  /></> },
             
            ]}
            data={productList}        
           
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
 
    const handleEditData=async()=>{
        var body={id:id,productname:productName,description:description,maincategoryid:mainCategoryId,subcategoryid:subCategoryId,brandid:brandId};
          
           var result=await postData('editproduct_data',body)
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
           fetchProduct()
           
      }

    const showProductDialog=()=>{
        return(<Dialog open={open} fullWidth={true} maxWidth={"sm"}>
          <DialogTitle>
            <TitleComponent title={'Update Product'} listicon=''/>
          </DialogTitle>
          <DialogContent>
          <div style={{margin:5}}>
          <Grid container spacing={2}>
          <Grid item xs={12}>
          <FormControl fullWidth>
                        <InputLabel>MainCategory Id</InputLabel>
                        <Select onFocus={()=>handleError('','maincategoryid')} error={formError.maincategoryid} value={mainCategoryId} label={"MainCategory Id"} onChange={handleFetchSubCategory}>
                          <MenuItem value="Select Category">Select Category</MenuItem>
                          {fillMainCategory()}
                        </Select>
                        <FormHelperText>{formError.maincategoryid}</FormHelperText>
                      </FormControl>

            </Grid>


            <Grid item xs={12}>
          <FormControl fullWidth>
                        <InputLabel>SubCategory Id</InputLabel>
                        <Select onFocus={()=>handleError('','subcategoryid')} error={formError.subcategoryid} value={subCategoryId} label={"SubCategory Id"} onChange={(event)=>setSubCategoryId(event.target.value)}>
                          <MenuItem value="Select Category">Select Category</MenuItem>
                          {fillSubCategory()}
                        </Select>
                        <FormHelperText>{formError.subcategoryid}</FormHelperText>
                      </FormControl>

            </Grid>


            <Grid item xs={12}>
          <FormControl fullWidth>
                        <InputLabel>Brand Id</InputLabel>
                        <Select onFocus={()=>handleError('','brandid')} error={formError.brandid} value={brandId} label={"Brand Id"} onChange={(event)=>setBrandId(event.target.value)}>
                          <MenuItem value="Select Category">Select Category</MenuItem>
                          {fillBrand()}
                        </Select>
                        <FormHelperText>{formError.brandid}</FormHelperText>
                      </FormControl>

            </Grid>








            <Grid item xs={12}>
                <TextField value={productName} error={formError.productname} helperText={formError.productname} onFocus={()=>handleError(false,'productname')} onChange={(event)=>setProductName(event.target.value)} fullWidth label="Product Name"></TextField>
            </Grid>
            <Grid item xs={12}>
                <TextField value={description} error={formError.des} helperText={formError.des} onFocus={()=>handleError(false,'des')} onChange={(event)=>setDescription(event.target.value)} fullWidth label="Description"></TextField>
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



    return(
        <div className={classes.display_root}>
        <div className={classes.display_box}>
        {listAllProduct()}
        </div>
        {showProductDialog()}
    </div>
    );
}