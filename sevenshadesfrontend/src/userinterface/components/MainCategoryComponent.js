import { Button } from '@mui/material';
import {useTheme} from '@mui/material/styles';
import UseMediaQuery from '@mui/material/useMediaQuery';
import { serverURL } from '../../services/FetchDjangoApiServices';
import { Link, useNavigate } from 'react-router-dom';

export default function MainCategoryComponent(props){
    const navigate = useNavigate()
    const theme=useTheme()
   
    const sm_matches=UseMediaQuery(theme.breakpoints.down('sm'));
    const md_matches=UseMediaQuery(theme.breakpoints.down('md')) 
    var data = props.data
    const handleClick=(item)=>{

       navigate('/productpage',{state:{products:item,pageView:'MainCategoryComponent'}})
    }
    const showAllItemss=()=>{
        return data.map((item)=>{
                return <div key={item.id} onClick={()=>handleClick(item)} style={{display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',padding:'30px',cursor:'pointer'}}>
                    <div>
                    
                    <img src={`${serverURL}/${item.icon}`} alt="" style={{width:sm_matches?280:426,height:sm_matches?350:545}}/>
                </div>
                <div style={{fontSize:25}}>
                   Trending clothes of {item.maincategoryname}
                </div>
               
                <div >  
        <Button onClick={()=>handleClick(item)} variant='contained' style={{width:'200px',height:'60px',fontSize:'22px',backgroundColor:'black',marginTop:'20px'}}  >Shop Now</Button>
        </div> 
               
            </div>
        })
    
    }

    return(   <div style={{display:'flex',justifyContent:'space-evenly',alignItems:'center', marginTop:50,flexDirection:sm_matches?'column':'row'}}>
    {showAllItemss()}
    
    </div>)
}