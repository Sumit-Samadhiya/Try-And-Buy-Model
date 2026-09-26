import { FormControl,FormHelperText,InputLabel, Select,MenuItem, Grid,TextField,Button,Avatar } from "@mui/material";
import { useState,useEffect } from "react";
import { useStyles } from "./CategoryCss";
import TitleComponent from "../components/admin/TitleComponent";
import { postData } from "../../services/FetchDjangoApiServices";
import Swal from "sweetalert2";
import { getData } from "../../services/FetchDjangoApiServices";
import iconimage from '../../images/icon.png'


export default function MySubCategory(){
    var classes = useStyles();

    const [icon,setIcon]=useState({file:'icon1.png',bytes:''})
    const [mainCategoryid,setMainCategoryid]=useState('')
    const [subCategoryName, setSubCategoryName] = useState("")
    const [formError,setFormError]=useState({icon:false})
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

    const handleChange=(event)=>{
        setIcon({file:URL.createObjectURL(event.target.files[0]),bytes:event.target.files[0]})
        handleError(false,"icon")
  }
    const handleReset=()=>{
        setIcon({file:'icon1.png',bytes:''})
        setMainCategoryid('')
        setSubCategoryName('')

    }

    const handleError=(errormessage,label)=>{
        setFormError((prev)=>({...prev,[label]:errormessage })
    
      )}
      
      const handleClick=async()=>{
           var err=false
           if(mainCategoryid.length===0)
           {
             handleError("This field is required","maincategoryid")
             err=true
           }
           if(subCategoryName.length===0)
           {
             handleError("This field is required","subcategoryname")
             err=true
           }
           if(icon.bytes.length===0)
           {
             handleError("pls select some icon","icon")
             err=true
           }
           if(err===false){
           var formData=new FormData()
           formData.append('maincategoryid',mainCategoryid)
           formData.append('subcategoryname',subCategoryName)
           formData.append('icon',icon.bytes)
           var result=await postData('mysubcategory_submit',formData)
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
                <TitleComponent title={'Sub Category'} listicon={iconimage} link='/admindashboard/displayallsubcategory'/>
            </Grid>
                    <Grid  item xs={12}>
                      <FormControl fullWidth>
                        <InputLabel>MainCategory Id</InputLabel>
                        <Select onFocus={()=>handleError('','maincategoryid')} error={formError.maincategoryid} value={mainCategoryid} label={"MainCategory Id"} onChange={(event)=>setMainCategoryid(event.target.value)}>
                          <MenuItem value="Select Category">Select Category</MenuItem>
                          {fillMainCategory()}
                        </Select>
                        <FormHelperText>{formError.maincategoryid}</FormHelperText>
                      </FormControl>
                        
                    </Grid>
                    <Grid item xs={12}>
                        <TextField label="Sub Category Name" error={formError.subcategoryname} helperText={formError.subcategoryname} onFocus={()=>handleError(false,'subcategoryname')} value={subCategoryName} fullWidth required onChange={(event)=>setSubCategoryName(event.target.value)} />
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