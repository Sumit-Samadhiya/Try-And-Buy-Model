import { useNavigate } from "react-router-dom"
import mainlogo from "../../../images/logo.png"
export default function TitleComponent(props){
     var navigate=useNavigate()
    return(<div style={{display:'flex'}}>
        <div style={{display:'flex',width:200,justifyContent:'space-between', alignItems:'center'}}>
        <img src={mainlogo} alt="" style={{width:50,height:50}}/>
        <div style={{fontSize:22,fontWeight:'bold'}}>{props.title}</div>
        </div>
        {props.listicon?
        <img onClick={()=>navigate(props.link)} src={props.listicon} alt="" style={{width:70,height:70,marginLeft:'auto'}}/>:<></>}
    </div>)
}

