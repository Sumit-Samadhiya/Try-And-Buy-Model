import { useLocation, useNavigate } from "react-router-dom"
import { postData } from "../../services/FetchDjangoApiServices"
import { useCallback, useEffect, useState } from "react"
import ProductDetailsComponent from "../components/ProductDetailsComponent"
import Header from "../components/Header"
import Footer from "../components/Footer"
import { Container, Paper, Typography, Button } from "@mui/material"

export default function ProductDetailsPage(props){
    const location = useLocation()
    const navigate = useNavigate()
    const searchParams = new URLSearchParams(location.search)
    const productid =
        location.state?.productid ||
        location.state?.product?.id ||
        searchParams.get('productid') ||
        searchParams.get('id') ||
        props?.productid

    const [productList, setProductList] = useState([])
    const [loading, setLoading] = useState(true)
    const [pageRefresh, setPageRefresh] = useState(false)

    const fetchAllProducts = useCallback(async () => {
        if (!productid) {
            setLoading(false)
            setProductList([])
            return
        }
        setLoading(true)
        const result = await postData('user_productsdetails_by_id', { productid: Number(productid) })
        if (result && result.status && Array.isArray(result.data)) {
            setProductList(result.data)
        } else {
            setProductList([])
        }
        setLoading(false)
    }, [productid])

    useEffect(() => {
        fetchAllProducts()
    }, [fetchAllProducts, pageRefresh])

    if (!productid || (!loading && productList.length === 0)) {
        return (
            <div>
                <Header />
                <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
                    <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '1px solid #e5e7eb' }}>
                        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: '#111827' }}>
                            Product Unavailable
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#6b7280', mb: 3 }}>
                            The requested product could not be found or has no available sizes/colors at this moment.
                        </Typography>
                        <Button
                            variant="contained"
                            sx={{ bgcolor: '#111827', fontWeight: 700, textTransform: 'none' }}
                            onClick={() => navigate('/home')}
                        >
                            Browse Catalog
                        </Button>
                    </Paper>
                </Container>
                <Footer />
            </div>
        )
    }

    return (
        <div>
            <ProductDetailsComponent
                pageRefresh={pageRefresh}
                setPageRefresh={setPageRefresh}
                productList={productList}
                initialColor={location.state?.color || searchParams.get('color')}
                initialSize={location.state?.size || searchParams.get('size')}
            />
        </div>
    )
}
