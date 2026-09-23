import { Grid,TextField,Button,Avatar } from "@mui/material";
import { useState } from "react";
import { useStyles } from "./CategoryCss";
import TitleComponent from "../components/admin/TitleComponent";
import { postData } from "../../services/FetchDjangoApiServices";
import Swal from "sweetalert2";
import iconimage from "../../images/icon.png"

export default function Category(props) {
  var classes = useStyles();
  const [mainCategoryName,setMainCategoryName]=useState('')
  const [icon,setIcon]=useState({file:'icon1.png',bytes:''})
  const [formError,setFormError]=useState({icon:false})
  const handleChange=(event)=>{
        setIcon({file:URL.createObjectURL(event.target.files[0]),bytes:event.target.files[0]})
        handleError(false,"icon")
  }
  const handleError=(errormessage,label)=>{
    setFormError((prev)=>({...prev,[label]:errormessage })

  )}
  
  const handleClick=async()=>{
       var err=false
       if(mainCategoryName.length==0)
       {
         handleError("This field is required","maincategoryname")
         err=true
       }
       if(icon.bytes.length==0)
       {
         handleError("pls select some icon","icon")
         err=true
       }
       if(err==false){
       var formData=new FormData()
       formData.append('maincategoryname',mainCategoryName)
       formData.append('icon',icon.bytes)
       var result=await postData('maincategory_submit',formData)
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


  return (
    <div className={classes.root}>
      <div className={classes.box}>
        <Grid container spacing={2}>
            <Grid item xs={12}>
                <TitleComponent title={'Main Category'} listicon={iconimage} link="/admindashboard/displayallcategory" />
            </Grid>
            <Grid item xs={12}>
                <TextField error={formError.maincategoryname} helperText={formError.maincategoryname} onFocus={()=>handleError(false,'maincategoryname')} onChange={(event)=>setMainCategoryName(event.target.value)} fullWidth label="Main Category Name"></TextField>
            </Grid>
            <Grid item xs={6} style={{display:'flex',justifyContent:'center',alignItems:'center',flexDirection:'column'}}>
                <Button fullWidth variant="contained" component='label'>
                    Upload Icon
                    <input  type="file" hidden accept="images/*" onChange={handleChange}/>
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

            <Grid item xs={6} style={{display:'flex'}}>
                <Button onClick={handleClick} variant="contained" fullWidth>Submit</Button>
            </Grid>
            <Grid item xs={6}>
                <Button variant="contained" fullWidth>Reset</Button>
            </Grid>
        </Grid>
      </div>
    </div>
  );
}


