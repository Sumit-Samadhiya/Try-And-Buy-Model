import Header from "../components/Header"

import SubcategoryComponent from "../components/SubcategoryComponent"
import SliderComponent from "../components/SliderComponent"
import Footer from "../components/Footer"
import { getData } from "../../services/FetchDjangoApiServices"
import BrandsComponent from "../components/BrandsComponent"
import MainCategoryComponent from "../components/MainCategoryComponent"
import AdvertiseComponent from "../components/AdvertiseComponent"
import { useNavigate } from "react-router-dom"

import { useState, useEffect } from "react"
export default function Home(props) {
    const navigate = useNavigate()
    const [listBanner, setListBanner] = useState([])
    const [listSubCategory, setSubCategoryList] = useState([])
    const [listBrands, setBrandsList] = useState([])
    const [listMainCategory, setMainCategoryList] = useState([])


    const fetchAllBanners = async () => {
        var result = await getData('user_banner_list')
        if (result && result.status && Array.isArray(result.data)) {
            let allImages = [];
            result.data.forEach(banner => {
                if (banner.icon) {
                    allImages = allImages.concat(banner.icon.split(',').filter(img => img));
                }
            });
            setListBanner(allImages);
        } else {
            setListBanner([]);
        }

    }


    const fetchAllSubCategoryList = async () => {
        var result = await getData('user_subcategory_list')
        if (result && result.status) {
            setSubCategoryList(result.data || [])
        } else {
            setSubCategoryList([])
        }

    }
    const fetchAllBrandsList = async () => {
        var result = await getData('user_brand_list')
        if (result && result.status) {
            setBrandsList(result.data || [])
        } else {
            setBrandsList([])
        }
    }
    const fetchAllMainCategoryList = async () => {
        var result = await getData('user_maincategory_list')
        if (result && result.status) {
            setMainCategoryList(result.data || [])
        } else {
            setMainCategoryList([])
        }
    }

    const handleSubCategoryClick = (item) => {
        navigate('/productpage', { state: { products: item, pageView: 'SubCategoryComponent' } })
    }

    const handleBrandClick = (item) => {
        navigate('/productpage', { state: { products: item, pageView: 'BrandComponent' } })
    }

    const handleBannerClick = () => {
        if (listMainCategory.length > 0) {
            navigate('/productpage', { state: { products: listMainCategory[0], pageView: 'MainCategoryComponent' } })
        }
    }

    useEffect(function () {
        fetchAllBanners()
        fetchAllSubCategoryList()
        fetchAllBrandsList()
        fetchAllMainCategoryList()
    }, [])

    return (<div style={{ position: 'relative', width: '100%' }}>
        <Header />
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>

            <div style={{ width: '100%', marginTop: 20, display: 'flex', justifyContent: 'center', }}>
                <SliderComponent data={listBanner} onBannerClick={handleBannerClick} />
            </div>


            <div style={{ width: '90%', maxWidth: 1440, display: 'flex', justifyContent: 'center', marginTop: 32 }}>
                <SubcategoryComponent data={listSubCategory} onItemClick={handleSubCategoryClick} />
            </div>

            <div style={{ width: '85%', display: 'flex', justifyContent: 'center', marginTop: '50px' }}>
                <MainCategoryComponent data={listMainCategory} />
            </div>

            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: '50px', alignItems: 'center' }}>
                <AdvertiseComponent />
            </div>



            <div style={{ width: '70%', display: 'flex', justifyContent: 'center', marginTop: '50px', alignItems: 'center' }}>
                <BrandsComponent data={listBrands} onItemClick={handleBrandClick} />
            </div>

            <div style={{ width: '98%', display: 'flex', justifyContent: 'center', marginTop: '50px', flexDirection: 'row' }}>
                <Footer />
            </div>

        </div>
    </div>)
}