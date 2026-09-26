import imageUrl from '../../services/imageUrl';
import MaterialTable from "@material-table/core";
import { useStyles } from "./CategoryCss";
import { useEffect,useState } from "react";
import TitleComponent from "../components/admin/TitleComponent";
import Swal from "sweetalert2";
import {FormControl,FormHelperText,InputLabel, Select,MenuItem, Button,TextField,Avatar } from "@mui/material";
import { getData, postData } from "../../services/FetchDjangoApiServices";
import Dialog from  '@mui/material/Dialog';
import  DialogActions  from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import {Grid} from "@mui/material";
import DialogTitle from "@mui/material/DialogTitle";


export default function DisplayAllSubCategory(){
    var classes=useStyles()
    const [open,setOpen]=useState(false)
    const [mySubCategoryList,setMySubCategoryList]=useState([])

    const [id,setId]=useState('')
    const [mainCategoryId,setMainCategoryId]=useState('')
   const [subCategoryName,setSubCategoryName]=useState('')
    const [icon,setIcon]=useState({file:'icon1.png',bytes:''})
    const [formError,setFormError]=useState({icon:false})
    const [btnStatus,setBtnStatus]=useState(true)
    const [tempIcon,setTempIcon]=useState('')
  
    const [mainCategoryList,setMainCategoryList]=useState([])


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



    const handleOpenDialog=(rowData)=>{
        setId(rowData.id)
        setMainCategoryId(rowData.maincategoryid.id)
        setSubCategoryName(rowData.subcategoryname)
        setIcon({file:imageUrl(rowData.icon),bytes:''})
        setTempIcon(imageUrl(rowData.icon))
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
            var deleteResult=await postData('deletemysubcategorydata',body)
            if(deleteResult.status)
            {
              Swal.fire("Deleted..", "","success" ) 
              
            } else { Swal.fire("Cannot delete", deleteResult.message || "This record is still in use.", "error"); }
            fetchAllSubCategory()
                
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
               var result=await postData('editmysubcategory_icon',formData)
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
               fetchAllSubCategory()
               setBtnStatus(true)
          }

          const handleError=(errormessage,label)=>{
            setFormError((prev)=>({...prev,[label]:errormessage })
        
          )}
    useEffect(function(){
        fetchAllSubCategory() 
      },[])
      const fetchAllSubCategory = async () => {
        try {
            var result = await getData('mysubcategory_list');
            if (result && result.data) {
                setMySubCategoryList(result.data);
            } else {
                // Handle case where result or result.data is null/undefined
                console.error('Error: Received null or undefined response from server');
            }
        } catch (error) {
            // Handle any errors that occurred during the request
            console.error('Error fetching main category data:', error);
        }
    };
    function listAllCategory() {
        
        return (
          <MaterialTable
            title={<TitleComponent title={'List Sub Category'} listicon='' />}
            columns={[
              { title: 'id', field: 'id' },
              { title: 'Main Category id', render:(rowData)=><div><div>{rowData.maincategoryid.id}</div><div>{rowData.maincategoryid.maincategoryname}</div></div> },
              { title: 'Sub Category name', field: 'subcategoryname' },
              { title: 'icon',render:(row)=><><img src={imageUrl(row.icon)} alt="icons" style={{width:40,height:40,borderRadius:10}}  /></> },
             
            ]}
            data={mySubCategoryList}        
           
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
        var body={id:id,subcategoryname:subCategoryName,maincategoryid:mainCategoryId};
          
           var result=await postData('editmysubcategory_data',body)
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
           fetchAllSubCategory()
           
      }

    const showCategoryDialog=()=>{
        return(<Dialog open={open} fullWidth={true} maxWidth={"sm"}>
          <DialogTitle>
            <TitleComponent title={'Update Category'} listicon=''/>
          </DialogTitle>
          <DialogContent>
          <div style={{margin:5}}>
          <Grid container spacing={2}>
          <Grid item xs={12}>
          <FormControl fullWidth>
                        <InputLabel>MainCategory Id</InputLabel>
                        <Select onFocus={()=>handleError('','maincategoryid')} error={formError.maincategoryid} value={mainCategoryId} label={"MainCategory Id"} onChange={(event)=>setMainCategoryId(event.target.value)}>
                          <MenuItem value="Select Category">Select Category</MenuItem>
                          {fillMainCategory()}
                        </Select>
                        <FormHelperText>{formError.maincategoryid}</FormHelperText>
                      </FormControl>
            </Grid>
            <Grid item xs={12}>
                <TextField value={subCategoryName} error={formError.subcategoryname} helperText={formError.maincategoryname} onFocus={()=>handleError(false,'subcategoryname')} onChange={(event)=>setSubCategoryName(event.target.value)} fullWidth label="Sub Category Name"></TextField>
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
        {listAllCategory()}
        </div>
        {showCategoryDialog()}
    </div>
    );
}
