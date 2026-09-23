import { useLocation } from "react-router-dom"
import { postData } from "../../services/FetchDjangoApiServices"
import { useEffect, useState } from "react"
import ProductDetailsComponent from "../components/ProductDetailsComponent"

export default function ProductDetailsPage(props){
    var location = useLocation()
    var productid=location.state.productid
    
   
    const [productList,setProductList]=useState([])

    const [pageRefresh,setPageRefresh]=useState(false)
   
    var fetchAllProducts=async()=>{
       
       var result=await postData('user_productsdetails_by_id',{productid:productid}) 
       setProductList(result.data)
    }
    useEffect(function(){
        fetchAllProducts()
       
    },[])

    return(<div>
        <div>
            <ProductDetailsComponent pageRefresh={pageRefresh} setPageRefresh={setPageRefresh} productList={productList}/> 
        </div>
    </div>)
}