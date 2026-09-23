import { serverURL } from '../../services/FetchDjangoApiServices';
import './ProductByCategory.css';
import { useNavigate } from 'react-router-dom';
import {useTheme} from '@mui/material/styles';
import UseMediaQuery from '@mui/material/useMediaQuery';
export default function ProductByCategory(props){

    const theme=useTheme()
    const sm_matches=UseMediaQuery(theme.breakpoints.down('sm'));
    const md_matches=UseMediaQuery(theme.breakpoints.down('md')); 
    const navigate = useNavigate()
    const handleNextPage=(item)=>{
       navigate('/productdetailspage',{state:{productid:item.id}})
    }
    var items=props.data

    const renderProducts = () => {
        return items.map((item, index) => (
            <div key={index} onClick={()=>handleNextPage(item)} className="product-item">
                <img src={`${serverURL}/${item.icon}`} alt="" className="product-image" />
                <div className="product-details">
                    <div>{item.productname}</div>
                    <div>{item.description}</div>
                   
                </div>
            </div>
        ));
    };


    return(
        <div className={sm_matches?"product-container-2":"product-container"}>
        {renderProducts()}
    </div>
    )
}