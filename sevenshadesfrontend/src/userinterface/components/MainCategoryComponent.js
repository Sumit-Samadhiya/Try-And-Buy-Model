import imageUrl from '../../services/imageUrl';
import { Button } from '@mui/material';
import {useTheme} from '@mui/material/styles';
import UseMediaQuery from '@mui/material/useMediaQuery';
import { useNavigate } from 'react-router-dom';

export default function MainCategoryComponent(props){
    const navigate = useNavigate()
    const theme=useTheme()
   
    const sm_matches=UseMediaQuery(theme.breakpoints.down('sm'));
    var data = props.data
    const handleClick=(item)=>{

       navigate('/productpage',{state:{products:item,pageView:'MainCategoryComponent'}})
    }
    const showAllItemss=()=>{
        return data.map((item)=>{
                return <div key={item.id} onClick={()=>handleClick(item)} style={{display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',padding: '12px', flex: '1 1 0', minWidth: 0, width: '100%', maxWidth: 450, boxSizing: 'border-box',cursor:'pointer'}}>
                    <div style={{width:'100%'}}>
                    
                    <img src={imageUrl(item.icon)} alt="" style={{display:'block',width:'100%',height:'auto',aspectRatio:'870 / 1110',objectFit:'cover'}}/>
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

    return(   <div style={{display:'flex',justifyContent:'space-evenly',alignItems:'center', width:'100%',gap:16,marginTop:0,flexDirection:sm_matches?'column':'row'}}>
    {showAllItemss()}
    
    </div>)
}