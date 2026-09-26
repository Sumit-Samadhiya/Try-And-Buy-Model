
import { serverURL } from "../../services/FetchDjangoApiServices";
import { Grid } from "@mui/material";
import {useTheme} from '@mui/material/styles';
import UseMediaQuery from '@mui/material/useMediaQuery';

export default function Icons(){

    const theme=useTheme()
   
  const sm_matches=UseMediaQuery(theme.breakpoints.down('sm'));
    const icons = () => {
        return (
            <Grid container spacing={sm_matches?2:6}>
                <Grid item xs={2}>
                    <img src={`${serverURL}/static/facebook.png`} alt="" style={{ width: '35px', height: "35px" }}></img>
                </Grid>
                <Grid item xs={2}>
                    <img src={`${serverURL}/static/instagram.png`} alt="" style={{ width: '35px', height: "35px" }}></img>
                </Grid>
                <Grid item xs={2}>
                    <img src={`${serverURL}/static/twitter.png`} alt="" style={{ width: '35px', height: "35px" }}></img>
                </Grid>
                <Grid item xs={2}>
                    <img src={`${serverURL}/static/paytm.png`} alt="" style={{ width: '35px', height: "35px" }}></img>
                </Grid>
                <Grid item xs={2}>
                    <img src={`${serverURL}/static/google-pay.png`} alt="" style={{ width: '35px', height: "35px" }}></img>
                </Grid>
                <Grid item xs={2}>
                    <img src={`${serverURL}/static/visa.png`} alt="" style={{ width: '35px', height: "35px" }}></img>
                </Grid>
            </Grid>
        );
    }
    return(
        <div>
            {icons()}
        </div>
    )
}
