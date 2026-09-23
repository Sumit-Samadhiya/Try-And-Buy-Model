import { postData, getData } from "../../services/FetchDjangoApiServices";
 
import Header from "../components/Header";
import ProductByCategory from "../components/ProductByCategory";
import Footer from "../components/Footer";

import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export default function ProductPage(props){
    var location=useLocation()
    const [productList,setProductList]=useState([])
    const setPageView=async()=>{
        var pageView=location.state?.pageView
        var products=location.state?.products

        if(!pageView || !products){
            setProductList([])
            return
        }
        
       
        
           if(pageView=="MainCategoryComponent"){
            var result = await postData('user_products_maincategory',{maincategoryid:products.id})
            setProductList(result?.data || [])
           }

           if(pageView=="SubCategoryComponent"){
            var resultSub = await postData('user_products_maincategory',{maincategoryid:products.maincategoryid})
            var subFiltered = (resultSub?.data || []).filter((item)=>item?.subcategoryid?.id===products.id)
            setProductList(subFiltered)
           }

           if(pageView=="BrandComponent"){
            var categoryResult = await getData('user_maincategory_list')
            const categoryIds = (categoryResult?.data || []).map((cat)=>cat.id)
            const productPromises = categoryIds.map((id)=>postData('user_products_maincategory',{maincategoryid:id}))
            const allProductResults = await Promise.all(productPromises)
            var allProducts = allProductResults.flatMap((res)=>res?.data || [])
            var brandFiltered = allProducts.filter((item)=>item?.brandid?.id===products.id)
            setProductList(brandFiltered)
           }   
       
    }
    useEffect(function(){
        setPageView();
    },[location.state])

    

    
    return (
       <div>
            <Header/>
             <div>
                <ProductByCategory data= {productList} /> 
             </div>
            <div style={{marginTop:'50px'}}>
            <Footer/>
            </div>
        </div>
    );
}
