import { Grid,TextField,Button,Avatar } from "@mui/material";
import { useState } from "react";
import { useStyles } from "./CategoryCss";
import TitleComponent from "../components/admin/TitleComponent";
import { postData } from "../../services/FetchDjangoApiServices";
import Swal from "sweetalert2";
import iconimage from '../../images/icon.png'

export default function Banner(){
    var classes=useStyles()
    const [description,setDescription]=useState('')
    const [icon,setIcon]=useState({file:[],bytes:[]})
    
    const [formError,setFormError]=useState({icon:false})
    const handleChange=(event)=>{
      var files=Object.values(event.target.files)
      if(files.length>=1 && files.length<=10){
        setIcon({file:files,bytes:event.target.files})
      }
      else {
        alert('Please choose between 1 and 10 images.')
      }
      handleError(false,"icon")
    }
  const handleError=(errormessage,label)=>{
    setFormError((prev)=>({...prev,[label]:errormessage }))
  }

  const handleReset = () => {
    setDescription('')
    setIcon({ file: [], bytes: [] })
    setFormError({ icon: false, description: false })
  }
  
  const showImages=()=>{
    return icon?.file?.map((item, i)=>{
     return <span key={i}><img src={URL.createObjectURL(item)} alt="" style={{width:40,height:40,borderRadius:10,marginRight:3}}/></span>
    })
  }
  const handleClick=async()=>{
       var err=false
       if(description.trim().length==0)
       {
         handleError("This field is required","description")
         err=true
       }
       if(icon.file.length==0)
       {
         handleError("Please select at least 1 image","icon")
         err=true
       }
       if(err==false){
       var formData=new FormData()
       formData.append('bannerdescription', description.trim())
       icon?.file?.forEach((item)=>{
         formData.append("icon",item)
       })
       var result=await postData('banner_submit',formData)
       if(result.status)
       {
        Swal.fire({
          title:"The Seven Shades",
          text:result.message,
          icon:"success",
          toast:true,
        })
        handleReset()
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
                <TitleComponent title={'Banner'} listicon={iconimage}/>
            </Grid>
            <Grid item xs={12}>
                <TextField error={formError.description} helperText={formError.description} onFocus={()=>handleError(false,'description')} value={description} onChange={(event)=>setDescription(event.target.value)} fullWidth label="Description"></TextField>
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

            <Grid item xs={6} style={{display:'flex'}}>
                <Button onClick={handleClick} variant="contained" fullWidth>Submit</Button>
            </Grid>
            <Grid item xs={6}>
                <Button onClick={handleReset} variant="contained" fullWidth>Reset</Button>
            </Grid>
        </Grid>
      </div>
    </div>
  );
}